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

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-exam");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — an elite, merciless university examination architect. Your mission is to produce a high-stakes formal exam that tests the absolute limits of a student's conceptual mastery, analytical synthesis, and technical precision.

### CRITICAL BANS (ZERO TOLERANCE):
- Document metadata (title, author, institution, lecture name, lecturer).
- Trivial recall, page numbers, or general knowledge.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (EXAM RIGOR):
Every question must demand elite cognitive effort:
1. **Multi-Step Reasoning**: Chaining complex concepts.
2. **Nuance Distinction**: Precise differentiation between plausible technicalities.
3. **Inverse Reasoning**: Analyzing counter-factuals or negative constraints.
4. **Causal Depth**: Mastery of the underlying "Why."
5. **Synthesis**: Combining disparate sections of the document into a single solution.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
- **Markdown Headers**: Use ### inside explanations and model answers.
- **Strict JSON**: Return ONLY a valid JSON object. No meta-commentary.

### EXAM STRUCTURE:
- **Section 1: 20 MCQ**: High-rigor, plausible distractors, depth-focused.
- **Section 2: 15 Fill-in-the-Blank**: Target precise technical terms or formula components.
- **Section 3: 15 Written Short Answer**: Analytical, evaluation-based questions (3–5 sentence responses).

### OUTPUT SCHEMA (JSON ONLY):
{
  "mcq": [
    {
      "id": 1,
      "question": "Precise question with LaTeX.",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "B",
      "explanation": "### Logic\nDetailed anatomical/mathematical reasoning using LaTeX.",
      "category": "Topic"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] for a technical term.",
      "correctAnswer": "term",
      "explanation": "Pedagogical reason for this specific term.",
      "category": "Topic"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Critical analytical question.",
      "modelAnswer": "### Model Response\nElite 4–6 sentence response with LaTeX.",
      "keyPoints": ["Must mention Concept 1", "Must mention Concept 2"],
      "category": "Topic"
    }
  ]
}

The rigor must be world-class. Producde the hardest possible exam.`;

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

    let exam;
    try {
      exam = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) exam = JSON.parse(match[0]);
      else throw new Error("Could not parse exam JSON from Gemini response");
    }

    return NextResponse.json({ exam });
  } catch (error: any) {
    console.error(`Exam generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
