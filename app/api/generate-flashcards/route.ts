import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateFile, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const fileError = validateFile(file);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-flashcards");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master mnemonic specialist. Your mission is to produce a high-density, pedagogical set of flashcards from this document.

### CRITICAL BANS (NEVER ASK):
- Document metadata (title, author, institution, speaker, dates).
- Trivial structural recall (page numbers, section headings).
- Generic general knowledge.

### REVISEFORGE EXCELLENCE FRAMEWORK (FLASHCARD DESIGN):
Every card must facilitate active recall and deep encoding:
1. **Term/Question**: Formulate specific, exam-worthy questions or terms.
2. **Definition/Answer**: Provide a comprehensive standalone explanation.
3. **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
4. **Chemical Structures**: If visualizing a chemical structure/molecule, output the SMILES string enclosed in a \`\`\`smiles code block inside the JSON string (escaping quotes if necessary).
5. **Markdown Headers**: Use ### inside definitions to structure complex answers.
6. **Elite Hint**: Provide a mnemonic, analogy, or conceptual "key" that aids recall without giving away the answer.

### SUBJECT-SPECIFIC RIGOR:
- **STEM**: Explain mechanisms at the molecular/physical level. Include reaction conditions and exact units.
- **Humanities**: Focus on causal relationships, theoretical frameworks, and historical significance.
- **Medicine/Nursing**: Pathophysiology, clinical presentation, and exact dosage/threshold values.

### OUTPUT SCHEMA (JSON ONLY):
[
  {
    "id": 1,
    "term": "Specific question or technical term using LaTeX where required.",
    "definition": "### Concept Overview\nDetailed pedagogical explanation using LaTeX ($ ... $). \n### Practical Application\nHow this concept is used in real scenarios.",
    "hint": "A powerful mnemonic or analogy.",
    "category": "Topic Area"
  }
]

Generate a minimum of 15 high-impact cards. Ensure the rigor is absolute.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let flashcards;
    try {
      flashcards = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        flashcards = JSON.parse(match[0]);
      } else {
        console.error(`Flashcard parsing error [User: ${user.id}]: No JSON found in response`);
        return serverError("Failed to parse flashcards from AI response");
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    console.error(`Flashcard generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
