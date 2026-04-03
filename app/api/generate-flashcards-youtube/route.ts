import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GenerationSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = GenerationSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { url } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-flashcards-youtube");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!url)
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master mnemonic specialist. Your mission is to watch this entire YouTube video and produce a high-density, pedagogical set of flashcards.

### CRITICAL BANS (NEVER ASK):
- Video metadata (title, channel, presenter, creator, date).
- Trivial structural recall or general knowledge.

### REVISEFORGE EXCELLENCE FRAMEWORK (FLASHCARD DESIGN):
Every card must facilitate active recall and deep encoding:
1. **Term/Question**: Formulate specific, exam-worthy questions or terms based on the video.
2. **Definition/Answer**: Provide a comprehensive standalone explanation.
3. **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
4. **Markdown Headers**: Use ### inside definitions to structure complex answers.
5. **Elite Hint**: Provide a powerful mnemonic, analogy, or conceptual "key" referencing how the speaker explained it.

### SUBJECT-SPECIFIC RIGOR:
- **STEM**: Mechanisms at molecular/physical levels. Use exact notation ($\lambda$, $\Delta H$, $\int$).
- **Humanities**: Causal relationships, theoretical frameworks, and historical significance.
- **Medicine/Nursing**: Pathophysiology, clinical presentation, and exact nursing interventions.

### OUTPUT SCHEMA (JSON ONLY):
{
  "flashcards": [
    {
      "id": 1,
      "term": "Specific question or technical term using LaTeX where required.",
      "definition": "### Concept Overview\nDetailed pedagogical explanation from the video using LaTeX ($ ... $). \n### Why it matters\nSignificance according to the speaker.",
      "hint": "A powerful mnemonic or analogy from the lecture.",
      "category": "Topic Area"
    }
  ]
}

Generate a minimum of 15 high-impact cards. Ensure the rigor is absolute.`;

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
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else throw new Error("Could not parse flashcards JSON");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Flashcards generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
