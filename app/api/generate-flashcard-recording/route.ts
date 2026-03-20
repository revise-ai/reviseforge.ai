// File path: app/api/generate-flashcards-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  text = text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*'([^']*)'/g, (_, val) => `: "${val.replace(/"/g, '\\"')}"`)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\u0000-\u001F\u007F]/g, (ch) =>
      ch === "\n" || ch === "\r" || ch === "\t" ? ch : "",
    );

  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  const fixed = text
    .split("\n")
    .map((line) => line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"))
    .join("\n");

  return JSON.parse(fixed);
}

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType, transcript } = await req.json();

    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        {
          error:
            "No audio or transcript provided. Please record something first.",
        },
        { status: 400 },
      );
    }

    const prompt = `You are ReviseForge AI — the world's most advanced flashcard generation engine. Listen to this entire recorded lecture and create flashcards that will help students truly master the subject matter, not just recognise surface details.

CRITICAL RULE — STRICTLY FORBIDDEN CARDS:
Never create flashcards about any of the following — these are useless for studying:
The name of the speaker or any person mentioned incidentally.
Any metadata about the recording such as date, length, or platform.
Questions like "What is this recording about?" or "Who is speaking?"
These cards test nothing. A student who never listened to the recording could answer them. They are banned.

WHAT YOU MUST FOCUS ON INSTEAD:
Every flashcard must test something a student needs to understand, remember, or be able to apply from the actual content of the recording. Ask yourself before every card: "Would a student who studied this recording hard need to know this for an exam?" If yes, create the card. If it is just metadata or filler, skip it entirely.

STEP 1 — DEEP CONTENT ANALYSIS:
Listen to the entire recording and extract every piece of meaningful knowledge:
Every key term, concept, definition, and technical vocabulary word the speaker introduces.
Every theory, model, framework, or principle explained.
Every process, mechanism, sequence of steps, or workflow demonstrated.
Every formula, equation, law, rule, or theorem stated.
Every cause-and-effect relationship or explanation of why something happens.
Every comparison or contrast between two or more ideas.
Every statistic, measurement, or quantitative fact that carries meaning.
Every real-world example or case study used to illustrate a concept.
Every exception, special case, or nuance mentioned.

STEP 2 — QUESTION DESIGN:
Write questions that require genuine understanding:
For definitions: "What is [concept] and why does it matter?"
For mechanisms: "How does [process] work?"
For causes: "Why does [phenomenon] occur?"
For formulas: "What is the formula for [calculation] and what does each part represent?"
For comparisons: "What is the difference between [X] and [Y]?"
For cause-and-effect: "What are the consequences of [event or condition]?"
For application: "How would you calculate or determine [result]?"
For sequences: "What are the stages or steps of [process]?"

STEP 3 — ANSWER DESIGN:
Every answer must be a complete, standalone explanation written in plain sentences:
Never answer with just a word or short phrase — always explain fully using the context from the recording.
For formulas: state the formula in plain text, define every variable, explain what it calculates.
For processes: explain each step and why it happens in that order.
For comparisons: explain both sides clearly and what makes them different.
For causes: explain the mechanism as the speaker described it, not just label it.
Write in clean plain sentences only. No asterisks, no hashtags, no bullet point symbols, no markdown formatting of any kind.

STEP 4 — HINT DESIGN:
Every hint must be a genuine memory aid:
Give a mnemonic, analogy, or memory cue connected to how the speaker explained it.
Mention a related concept from the recording that connects to the answer.
Reference the context from the recording to trigger recall.
Never repeat the question or give away the answer directly.

IMPORTANT: Return ONLY a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON. Use double quotes for ALL property names and string values. Do not use trailing commas.

{
  "flashcards": [
    {
      "id": 1,
      "term": "A specific, exam-worthy question about actual content from the recording",
      "definition": "A complete, educational explanation in plain sentences — no asterisks, no hashtags, no bullet symbols",
      "hint": "A memory cue, analogy, or contextual clue that helps recall without giving the answer",
      "category": "Specific subject area from the recording (e.g. Organic Chemistry, Cell Division, Keynesian Economics)"
    }
  ]
}

Minimum 15 cards, no maximum — cover every piece of meaningful knowledge from the recording. A student should be able to study exclusively from these cards and feel confident going into an exam on this content.`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob from the recording ────────────────────────
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType, // e.g. "audio/webm", "audio/mp4", "audio/wav"
                data: audioBase64, // raw base64, no "data:..." prefix
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      // ── Path B: fallback to transcript text ───────────────────────────────
      const transcriptContext = `The following is a transcript of the recorded lecture. Use it as the sole source of content for the flashcards.\n\n${transcript}\n\n`;
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
      console.error(
        "Flashcards recording JSON parse failed:",
        parseErr.message,
      );
      console.error("Raw response (first 500 chars):", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse flashcards response. Please try again." },
        { status: 500 },
      );
    }

    if (
      !data?.flashcards ||
      !Array.isArray(data.flashcards) ||
      data.flashcards.length === 0
    ) {
      return NextResponse.json(
        { error: "No flashcards were generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Flashcards recording generation error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    if (error?.message?.includes("size") || error?.message?.includes("limit")) {
      return NextResponse.json(
        {
          error: "Recording is too large to process. Try a shorter recording.",
        },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 },
    );
  }
}
