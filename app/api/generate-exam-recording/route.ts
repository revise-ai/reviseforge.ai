// File path: app/api/generate-exam-recording/route.ts
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

    // Must have either audio blob or a transcript fallback
    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        { error: "No audio or transcript provided. Please record something first." },
        { status: 400 }
      );
    }

    const prompt = `You are ReviseForge AI — an elite, merciless exam generator. Listen to this entire recorded lecture from start to finish and produce the hardest possible formal exam a well-prepared student could face based exclusively on what is taught in the recording.

ABSOLUTE BANS — ZERO TOLERANCE — NEVER ASK:
The name of the speaker, recorder, or any person mentioned incidentally.
Any question answerable from general knowledge without having listened to this specific recording.
Any trivial recall question — every question must require understanding, not just memory.

DIFFICULTY REQUIREMENTS — EVERY QUESTION MUST USE AT LEAST ONE:
Multi-step reasoning: the student must chain two or more concepts together to reach the answer.
Nuance distinction: three options are partially correct, only one is fully precise and accurate.
Exception testing: tests an edge case or condition where the general rule breaks down.
Inverse reasoning: asks what would NOT happen, or which statement is INCORRECT.
Quantitative precision: requires an exact number, rate, threshold, ratio, or formula component stated in the recording.
Causal depth: asks the underlying mechanism or WHY something happens, not just what happens.
Application transfer: applies a concept from the recording to a completely new scenario.
Synthesis: combines information from two different sections or moments of the recording.

SECTION 1 — 20 MCQ (ids 1 to 20):
All four options must use correct subject-area terminology from the recording — some applied correctly, some subtly wrong.
All four options must be approximately the same length so the correct answer never stands out visually.
At least one distractor per question must represent a common misconception related to the topic.
Every option must sound completely plausible to a student who listened carelessly.
Never use "all of the above" or "none of the above".
The explanation must state why the correct answer is right and why each individual wrong option is specifically wrong, with reference to what was actually said in the recording.

SECTION 2 — 15 FILL IN THE BLANK (ids 21 to 35):
The blank must target a specific technical term, exact number, formula component, or precise definition word from the recording.
The surrounding sentence must provide enough context to be unambiguous but not easy.
There must be only one correct answer — no acceptable synonyms or alternatives.
The correct answer must be one to five words maximum.
It must be impossible to answer correctly without having listened to and understood this specific recording.

SECTION 3 — 15 WRITTEN SHORT ANSWER (ids 36 to 50):
Every question requires a minimum three to five sentence analytical response.
Never ask simple recall — every question must require analysis, synthesis, or evaluation of content from the recording.
Use question types such as: Explain the mechanism of X and why it produces outcome Y. Compare X and Y and discuss their implications. Evaluate the strengths and limitations of theory or model X as explained in the recording. Apply concept X from the recording to a new scenario. What would happen if condition Z changed and why? Critically assess the evidence for claim X as presented by the speaker.
The model answer must be four to six dense, accurate, fully analytical sentences grounded in what the recording actually covers.
Key points must list the exact concepts the student must mention to earn full marks.

IMPORTANT: Return ONLY a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON. Use double quotes for ALL property names and string values. Do not use trailing commas.

{
  "mcq": [
    {
      "id": 1,
      "question": "Full precise question text requiring deep understanding of the recording content",
      "options": {
        "A": "A plausible option using correct terminology from the recording",
        "B": "A plausible option using correct terminology from the recording",
        "C": "A plausible option using correct terminology from the recording",
        "D": "A plausible option using correct terminology from the recording"
      },
      "correctAnswer": "B",
      "explanation": "B is correct because [specific reason from recording]. A is wrong because [specific reason]. C is wrong because [specific reason]. D is wrong because [specific reason].",
      "category": "Specific topic area from the recording"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] targeting a precise term or value from the recording.",
      "correctAnswer": "exact term only",
      "explanation": "Why this is the only correct answer based on what was stated in the recording.",
      "category": "Specific topic area from the recording"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Hard analytical question requiring a full written response based on the recording content.",
      "modelAnswer": "Complete 4 to 6 sentence model answer covering all key analytical points drawn from the recording.",
      "keyPoints": ["Concept 1 the student must address", "Concept 2 the student must address", "Concept 3 the student must address"],
      "category": "Specific topic area from the recording"
    }
  ]
}`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob from the recording ────────────────────────
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,       // e.g. "audio/webm", "audio/mp4", "audio/wav"
                data: audioBase64, // raw base64, no "data:..." prefix
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      // ── Path B: no audio blob — use live transcript text as context ───────
      const transcriptContext =
        `The following is a transcript of the recorded lecture. Use it as the sole source of content for the exam.\n\n${transcript}\n\n`;
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

    let exam: any;
    try {
      exam = extractJSON(rawText);
    } catch (parseErr: any) {
      console.error("Exam recording JSON parse failed:", parseErr.message);
      console.error("Raw response (first 500 chars):", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse exam response. Please try again." },
        { status: 500 }
      );
    }

    // Validate structure
    if (!exam?.mcq || !exam?.fillInBlank || !exam?.written) {
      return NextResponse.json(
        { error: "Exam was not generated correctly. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ exam });

  } catch (error: any) {
    console.error("Exam recording generation error:", error);

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
      { error: error.message || "Failed to generate exam" },
      { status: 500 }
    );
  }
}