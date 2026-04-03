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

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-flashcard-recording");
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

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master mnemonic specialist. Your mission is to listen to this entire recorded lecture and produce a high-density, pedagogical set of flashcards.

### CRITICAL BANS (NEVER ASK):
- Recording metadata (speaker name, dates, location).
- Trivial structural recall or general knowledge.

### REVISEFORGE EXCELLENCE FRAMEWORK (FLASHCARD DESIGN):
Every card must facilitate active recall and deep encoding:
1. **Term/Question**: Formulate specific, exam-worthy questions or terms based on the recording.
2. **Definition/Answer**: Provide a comprehensive standalone explanation.
3. **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
4. **Markdown Headers**: Use ### inside definitions to structure complex answers.
5. **Elite Hint**: Provide a powerful mnemonic, analogy, or conceptual "key" referencing how the speaker explained it.

### SUBJECT-SPECIFIC RIGOR:
- **STEM**: Mechanisms at molecular/physical levels. Use exact notation ($\pi$, $\alpha$, $\beta$).
- **Humanities**: Causal relationships, theoretical frameworks, and historical significance.
- **Medicine/Nursing**: Pathophysiology, clinical presentation, and precise anatomical relationships.

### OUTPUT SCHEMA (JSON ONLY):
{
  "flashcards": [
    {
      "id": 1,
      "term": "Specific question or technical term using LaTeX where required.",
      "definition": "### Concept Overview\nDetailed pedagogical explanation from the lecture using LaTeX ($ ... $). \n### Why it matters\nSignificance according to the speaker.",
      "hint": "A powerful mnemonic or analogy from the recording.",
      "category": "Topic Area"
    }
  ]
}

Generate a minimum of 15 high-impact cards. Ensure the rigor is absolute.`;

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
    console.error(`Flashcards recording generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
