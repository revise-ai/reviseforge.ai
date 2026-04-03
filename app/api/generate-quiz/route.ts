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

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-quiz");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — a world-class academic tutor and the world's most sophisticated MCQ examination engine. Your mission is to create 30 elite-level multiple-choice questions that test deep conceptual mastery, analytical reasoning, and practical application.

### CRITICAL BANS (NEVER ASK):
- Document metadata (title, author, institution, lecturer name, dates, page/slide numbers).
- Trivial recall or general knowledge not specific to this document.
- Questions with obviously wrong distractors.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (DIFFICULTY & RIGOR):
Every question must meet at least ONE of these elite criteria:
1. **Multi-Step Reasoning**: Chaining 2+ concepts ($A \rightarrow B \rightarrow C$).
2. **Nuance Distinction**: Subtle differences between 4 plausible options.
3. **Exception Testing**: Edge cases where general rules fail.
4. **Inverse Reasoning**: Asks what is NOT true or the opposite effect.
5. **Causal Depth**: Underlying mechanisms ($the "why"$).
6. **Quantitative Precision**: Exact formula components or thresholds.
7. **Application Transfer**: Applying a concept to a brand new scenario.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
- **Markdown Headers**: Use ### inside explanations to organize sections.
- **Strict JSON**: Return ONLY a valid JSON array. No preamble, no meta-commentary.

### SUBJECT-SPECIFIC DEPTH:
- **STEM**: Mechanisms at molecular/cellular/physical levels. Use exact notation ($\text{H}_2\text{O}$, $\sum F = ma$).
- **Humanities**: Causation and consequence, not just dates. Distinguish between similar theories.
- **Nursing/Medicine**: Clinical application, contraindications, and pathophysiology.

### OUTPUT STRUCTURE (JSON):
[
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
    "explanation": "### Why it's correct\nReasoning based on the document using LaTeX ($ ... $). \n### Why distractors are wrong\nExplain the specific misunderstanding for B, C, and D.",
    "category": "Topic area",
    "difficulty": "hard"
  }
]

Generate exactly 30 questions. The rigor must be absolute.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Data } },
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

    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        console.error(`Quiz parsing error [User: ${user.id}]: No JSON found in response`);
        return serverError("Failed to parse quiz from AI response");
      }
    }

    return NextResponse.json({ questions });
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
