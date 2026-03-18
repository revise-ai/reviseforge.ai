// File path: app/api/generate-quiz-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try { return JSON.parse(text); } catch { /* continue */ }

  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  text = text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*'([^']*)'/g, (_, val) => `: "${val.replace(/"/g, '\\"')}"`)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\u0000-\u001F\u007F]/g, (ch) =>
      ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
    );

  try { return JSON.parse(text); } catch { /* continue */ }

  const fixed = text.split("\n").map((line) =>
    line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
  ).join("\n");

  return JSON.parse(fixed);
}

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType, transcript } = await req.json();

    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        { error: "No audio or transcript provided. Please record something first." },
        { status: 400 }
      );
    }

    const prompt = `You are ReviseForge AI — the world's most ruthlessly difficult MCQ exam generator. Listen to this entire recorded lecture and generate exactly 15 multiple-choice questions that will genuinely challenge even the most prepared students. These questions must separate students who truly understood the recording from those who merely listened passively.

CRITICAL RULES — STRICTLY FORBIDDEN:
Never ask about the speaker name, recording date, or any metadata.
Never create questions that could be answered without actually listening to this specific recording.
Never repeat or reword the same concept across multiple questions.
Never use "all of the above" or "none of the above" as options.
Exactly 15 questions — no more, no less.

DIFFICULTY REQUIREMENTS — NON-NEGOTIABLE:
Every question must meet at least one of these criteria:

Multi-step reasoning: The student must apply two or more concepts from different parts of the recording together to reach the answer.
Nuance distinction: Three of the four options are partially correct, but only one is precisely accurate.
Exception testing: The question tests a rare exception, edge case, or condition where the general rule breaks down.
Inverse reasoning: The question asks what would NOT happen, what is INCORRECT, or what is the OPPOSITE of what was explained.
Quantitative precision: The question requires exact knowledge of a number, rate, formula, threshold, or specific statistic mentioned in the recording.
Causal depth: The question asks about the underlying mechanism or root cause rather than just the observable outcome.
Comparative analysis: The student must distinguish between two similar concepts that are commonly confused, as explained in the recording.
Application transfer: A scenario is described and the student must apply a concept from the recording to that new situation.
Synthesis: The student must combine information from two different sections or moments of the recording.
Critical evaluation: The student must identify which statement is most accurate, most complete, or best supported by what was said in the recording.

DISTRACTOR DESIGN — THIS IS WHAT MAKES QUESTIONS HARD:
All four options must sound plausible to someone who listened carelessly.
At least two distractors must use correct terminology from the recording but apply it wrongly.
At least one distractor must represent a common misconception or oversimplification of the correct answer.
All four options must be approximately the same length so the correct answer does not stand out visually.
Never make the correct answer obviously more detailed or precise than the others.

EXPLANATION REQUIREMENTS:
For every question write a detailed explanation that states clearly why the correct answer is right with specific reasoning from the recording content. Explain why each wrong option is wrong and what mistake a student would have made by choosing it. Reference the underlying principle rather than just the bare fact. Write in plain clear sentences. No markdown formatting symbols, no asterisks, no hashtags.

IMPORTANT: Return ONLY a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON. Use double quotes for ALL property names and string values. Do not use trailing commas.

{
  "questions": [
    {
      "id": 1,
      "question": "A precise, challenging question written as a complete sentence requiring deep understanding of the recording content",
      "options": {
        "A": "A plausible option using correct terminology from the recording",
        "B": "A plausible option using correct terminology from the recording",
        "C": "A plausible option using correct terminology from the recording",
        "D": "A plausible option using correct terminology from the recording"
      },
      "correctAnswer": "B",
      "explanation": "Why B is correct with specific reasoning from the recording. Why A is wrong and what mistake leads there. Why C is wrong and what mistake leads there. Why D is wrong and what mistake leads there.",
      "category": "Specific topic area from the recording",
      "difficulty": "hard"
    }
  ]
}

Generate exactly 15 questions. The difficulty must be genuinely high — these questions should make even students who listened carefully think hard.`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob from the recording ────────────────────────
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,          // e.g. "audio/webm", "audio/mp4", "audio/wav"
                data: audioBase64, // raw base64, no "data:..." prefix
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      // ── Path B: fallback to transcript text ───────────────────────────────
      const transcriptContext =
        `The following is a transcript of the recorded lecture. Use it as the sole source of content for the quiz.\n\n${transcript}\n\n`;
      contents = [
        {
          role: "user",
          parts: [{ text: transcriptContext + prompt }],
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
    });

    const rawText = response.text ?? "";

    let data: any;
    try {
      data = extractJSON(rawText);
    } catch (parseErr: any) {
      console.error("Quiz recording JSON parse failed:", parseErr.message);
      console.error("Raw response (first 500 chars):", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse quiz response. Please try again." },
        { status: 500 }
      );
    }

    if (!data?.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      return NextResponse.json(
        { error: "No questions were generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Quiz recording generation error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (error?.message?.includes("size") || error?.message?.includes("limit")) {
      return NextResponse.json(
        { error: "Recording is too large to process. Try a shorter recording." },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}