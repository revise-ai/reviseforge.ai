import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { validateFile, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
    "definition": "### Concept Overview\nDetailed pedagogical explanation using LaTeX ($ ... $). \\n### Practical Application\nHow this concept is used in real scenarios.",
    "hint": "A powerful mnemonic or analogy.",
    "category": "Topic Area"
  }
]

Generate a minimum of 15 high-impact cards. Ensure the rigor is absolute.`;

    // --- Exponential Backoff Retry Strategy ---
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    while (attempts < maxAttempts) {
      try {
        response = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ]);
        break; // Success! Exit the loop.
      } catch (err: any) {
        attempts++;
        const isQuotaError = err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 429;
        
        if (isQuotaError && attempts < maxAttempts) {
          const delay = attempts * 3000; // 3s, 6s...
          console.warn(`Flashcard API Rate Limited. Retrying in ${delay}ms... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err; // If it's not a quota error or we're out of attempts, re-throw.
      }
    }

    if (!response) throw new Error("No response from AI after multiple attempts.");

    const rawText = response.response.text();
    console.log(`[Flashcard API] Raw AI Response for User ${user.id}:`, rawText);

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let flashcards;
    try {
      flashcards = JSON.parse(cleaned);
    } catch (parseError) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          flashcards = JSON.parse(match[0]);
        } catch {
          console.error(`Flashcard JSON parse failure [User: ${user.id}]:`, parseError);
          return NextResponse.json({ error: "The AI gave an unparseable JSON format. Please try again." }, { status: 500 });
        }
      } else {
        console.error(`Flashcard parsing error [User: ${user.id}]: No JSON array found in response`);
        return NextResponse.json({ error: "The AI failed to generate a structured flashcard set. Please try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    console.error(`Flashcard generation error [User: ${user.id}]:`, error);

    const isQuota = error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429;
    if (isQuota) {
      return NextResponse.json(
        { error: "AI quota exceeded (20 requests/day limit). Please wait until your limit resets." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: error.message || "An unexpected error occurred while generating flashcards." }, { status: 500 });
  }
}
