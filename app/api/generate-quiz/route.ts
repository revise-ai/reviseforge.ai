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

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-quiz");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — a helpful academic tutor. Your mission is to create 25 multiple-choice questions that test deep conceptual mastery of this document.

### CRITICAL BANS (NEVER ASK):
- Document metadata (title, author, institution, page numbers).
- Trivial recall or general knowledge.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (v2.1):
Every question must meet at least ONE of these elite criteria:
1. **Multi-Step Reasoning**: Chaining 2+ concepts ($A \rightarrow B \rightarrow C$).
2. **Nuance Distinction**: Subtle differences between 4 plausible options.
3. **Exception Testing**: Edge cases where general rules fail.
4. **Inverse Reasoning**: Asks what is NOT true or the opposite effect.
5. **Causal Depth**: Underlying mechanisms ($the "why"$).
6. **Quantitative Precision**: Exact formula components or thresholds.
7. **Application Transfer**: Applying a concept to a brand new scenario.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical, scientific, and technical notations ($...$, $$...$$).
- **Visuals in Explanations**: If explaining a process, use \`\`\`mermaid\`\`\`. If explaining a molecule, use \`\`\`smiles\`\`\$.
- **Markdown Headers**: Use ### inside explanations to organize sections.
- **Strict JSON**: Return ONLY a valid JSON array. No preamble.

### OUTPUT STRUCTURE (JSON):
[
  {
    "id": 1,
    "question": "Precise, challenging question with LaTeX notation ($ ... $).",
    "options": {
      "A": "Terminology-rich option",
      "B": "Terminology-rich option",
      "C": "Terminology-rich option",
      "D": "Terminology-rich option"
    },
    "correctAnswer": "A",
    "explanation": "### Why it's correct\nReasoning using LaTeX ($ ... $). \\n### Structural Detail\n(Optional) \`\`\`smiles or mermaid\`\`\` logic. \\n### Distractor Analysis\nExplain the precise misunderstanding for B, C, and D.",
    "category": "Topic area",
    "difficulty": "hard"
  }
]

Generate exactly 25 questions. The rigor must be absolute.`;

    // --- Exponential Backoff Retry Strategy ---
    let response;
    let attempts = 0;
    const maxAttempts = 5; // Increased to 5 for better resilience
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    while (attempts < maxAttempts) {
      try {
        response = await model.generateContent([
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ]);
        break; 
      } catch (err: any) {
        attempts++;
        const isQuotaError = err?.message?.includes("429") || err?.message?.includes("quota") || err?.status === 429;
        const isServiceUnavailable = err?.status === 503 || err?.message?.includes("503") || err?.message?.includes("Service Unavailable");
        
        if ((isQuotaError || isServiceUnavailable) && attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
          console.warn(`Quiz API ${isQuotaError ? 'Rate Limited' : 'Service Unavailable'}. Retrying in ${Math.round(delay)}ms... (Attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    if (!response) throw new Error("No response from AI after multiple attempts.");

    const rawText = response.response.text();
    console.log(`[Quiz API] Raw AI Response for User ${user.id}:`, rawText);

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch (parseError) {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          questions = JSON.parse(match[0]);
        } catch {
          console.error(`Quiz JSON parse failure [User: ${user.id}]:`, parseError);
          return NextResponse.json({ error: "The AI gave an unparseable JSON format. Please try again." }, { status: 500 });
        }
      } else {
        console.error(`Quiz parsing error [User: ${user.id}]: No JSON array found in response`);
        return NextResponse.json({ error: "The AI failed to generate a structured quiz set. Please try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error(`Quiz generation error [User: ${user.id}]:`, error);

    const isQuota = error?.message?.includes("429") || error?.message?.includes("quota") || error?.status === 429;
    if (isQuota) {
      return NextResponse.json(
        { error: "AI quota exceeded (20 requests/day limit). Please wait until your limit resets." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: error.message || "An unexpected error occurred while generating the quiz." }, { status: 500 });
  }
}
