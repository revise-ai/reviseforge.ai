import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GenerationSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

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
  const body = await req.json();
  const result = GenerationSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { audioBase64, mimeType, transcript } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-exam-recording");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        {
          error:
            "No audio or transcript provided. Please record something first.",
        },
        { status: 400 },
      );
    }

    const prompt = `You are ReviseForge AI — an elite, merciless university examination architect. Your mission is to listen to this entire recorded lecture and produce a high-stakes formal exam that tests the absolute limits of a student's conceptual mastery.

### CRITICAL BANS (ZERO TOLERANCE):
- Recording metadata (speaker name, date, location).
- Trivial recall or general knowledge.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (EXAM RIGOR):
Every question must demand elite cognitive effort:
1. **Multi-Step Reasoning**: Connecting multiple technical points from the recording.
2. **Nuance Distinction**: Precise differentiation between plausible technicalities mentioned in the audio.
3. **Inverse Reasoning**: Analyzing counter-factuals or negative constraints based on the lecture.
4. **Causal Depth**: Mastery of the underlying "Why."
5. **Synthesis**: Combining information from different moments of the recording into a single solution.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
- **Markdown Headers**: Use ### inside explanations and model answers.
- **Strict JSON**: Return ONLY a valid JSON object. No meta-commentary.

### EXAM STRUCTURE:
- **Section 1: 20 MCQ**: High-rigor, plausible distractors, depth-focused.
- **Section 2: 15 Fill-in-the-Blank**: Target precise technical terms, statistics, or formula components from the lecture.
- **Section 3: 15 Written Short Answer**: Analytical, evaluation-based questions (3–5 sentence responses).

### OUTPUT SCHEMA (JSON ONLY):
{
  "mcq": [
    {
      "id": 1,
      "question": "Precise question with LaTeX.",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "B",
      "explanation": "### Logic\nDetailed reasoning based on the recorded content using LaTeX.",
      "category": "Topic"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] for a term from the recording.",
      "correctAnswer": "term",
      "explanation": "Pedagogical reason for this term.",
      "category": "Topic"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Critical analytical question about the lecture.",
      "modelAnswer": "### Model Response\nElite 4–6 sentence response referencing the lecture with LaTeX.",
      "keyPoints": ["Must address X", "Must address Y"],
      "category": "Topic"
    }
  ]
}

The rigor must be world-class. Produce the hardest possible exam based on this recording.`;

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
      const transcriptContext = `The following is a transcript of the recorded lecture. Use it as the sole source of content for the exam.\n\n${transcript}\n\n`;
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
      return NextResponse.json(
        { error: "Failed to parse exam response. Please try again." },
        { status: 500 },
      );
    }

    if (!exam?.mcq || !exam?.fillInBlank || !exam?.written) {
      return NextResponse.json(
        { error: "Exam was not generated correctly. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ exam });
  } catch (error: any) {
    console.error(`Exam recording generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
