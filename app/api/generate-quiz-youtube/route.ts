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

  const lines = text.split("\n");
  const fixed = lines
    .map((line) => {
      return line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    })
    .join("\n");

  return JSON.parse(fixed);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = GenerationSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { url } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-quiz-youtube");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!url)
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master examination engine. Your mission is to watch this entire YouTube video and generate exactly 15 elite-level multiple-choice questions that test deep conceptual mastery.

### CRITICAL BANS (NEVER ASK):
- Video metadata (title, channel, presenter, date).
- Trivial recall not specific to the video's core teaching.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (DIFFICULTY & RIGOR):
Every question must meet at least ONE of these elite criteria:
1. **Multi-Step Reasoning**: Connecting multiple points from different moments in the video.
2. **Nuance Distinction**: Subtle differences between 4 plausible options.
3. **Exception Testing**: Edge cases mentioned by the speaker.
4. **Inverse Reasoning**: Asks what is NOT true or the opposite effect.
5. **Causal Depth**: Underlying mechanisms ($the "why"$).
6. **Quantitative Precision**: Exact formula components, thresholds, or statistics from the video.
7. **Application Transfer**: Applying a concept from the video to a new scenario.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
- **Markdown Headers**: Use ### inside explanations to organize sections.
- **Strict JSON**: Return ONLY a valid JSON object. No meta-commentary.

### OUTPUT STRUCTURE (JSON ONLY):
{
  "questions": [
    {
      "id": 1,
      "question": "Precise, challenging question with LaTeX notation where required.",
      "options": {
        "A": "Plausible option with correct terminology",
        "B": "Plausible option with correct terminology",
        "C": "Plausible option with correct terminology",
        "D": "Plausible option with correct terminology"
      },
      "correctAnswer": "A",
      "explanation": "### Why it's correct\nReasoning based on the video content using LaTeX ($ ... $). \n### Why distractors are wrong\nExplain the specific misunderstanding for B, C, and D based on what the speaker said.",
      "category": "Topic area from video",
      "difficulty": "hard"
    }
  ]
}

Generate exactly 15 questions. The rigor must be absolute.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ fileData: { fileUri: url } }, { text: prompt }],
        },
      ],
    });

    const rawText = response.text ?? "";

    let data: any;
    try {
      data = extractJSON(rawText);
    } catch (parseErr: any) {
      console.error("Quiz JSON parse failed:", parseErr.message);
      return NextResponse.json(
        { error: "Failed to parse quiz response. Please try again." },
        { status: 500 },
      );
    }

    if (
      !data?.questions ||
      !Array.isArray(data.questions) ||
      data.questions.length === 0
    ) {
      return NextResponse.json(
        { error: "No questions were generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Quiz generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
