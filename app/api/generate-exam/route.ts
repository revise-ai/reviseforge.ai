// File path: app/api/generate-exam/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — an elite, merciless university exam generator. Your sole job is to read every word of this document and produce the hardest possible formal exam a well-prepared student could face.

══════════════════════════════════════════
ABSOLUTE BANS — ZERO TOLERANCE — NEVER ASK:
══════════════════════════════════════════
• The document title, lecture title, course name, course code
• The lecturer, author, professor, instructor name or their role/title
• The university, department, institution, semester, date, or year of the document
• Page numbers, slide numbers, chapter numbers, section headings, document structure
• Any question answerable from general knowledge WITHOUT having read this specific document
• Any trivial recall question — every question must require understanding, not just memory

══════════════════════════════════════════
DIFFICULTY REQUIREMENTS — EVERY QUESTION MUST USE AT LEAST ONE:
══════════════════════════════════════════
• MULTI-STEP REASONING — student must chain 2+ concepts together to reach the answer
• NUANCE DISTINCTION — 3 options are partially correct, only one is fully precise and accurate
• EXCEPTION TESTING — tests an edge case or condition where the general rule breaks down
• INVERSE REASONING — asks what would NOT happen, or which statement is INCORRECT
• QUANTITATIVE PRECISION — requires exact number, rate, threshold, ratio, or formula component
• CAUSAL DEPTH — asks the underlying mechanism or WHY, not just what happens
• APPLICATION TRANSFER — applies a concept from the document to a completely new scenario
• SYNTHESIS — combines information from two different parts of the document

══════════════════════════════════════════
SECTION 1 — 20 MCQ (ids 1 to 20)
══════════════════════════════════════════
All 4 options MUST:
• Use correct subject-area terminology (some applied correctly, some subtly wrong)
• Be approximately the same length — never let the correct answer be obviously longer
• Include at least one common misconception as a distractor
• Sound completely plausible to a student who studied carelessly
• NEVER use "all of the above" or "none of the above"

Explanation MUST cover: why the correct answer is right + why each wrong option is specifically wrong.

══════════════════════════════════════════
SECTION 2 — 15 FILL IN THE BLANK (ids 21 to 35)
══════════════════════════════════════════
• The blank [BLANK] must target a specific technical term, exact number, formula component, or precise definition word from the document
• Surrounding sentence must provide enough context to be unambiguous, but NOT easy
• Only ONE correct answer — no acceptable synonyms
• Correct answer is 1–5 words maximum
• Impossible to answer correctly without having studied this document

══════════════════════════════════════════
SECTION 3 — 15 WRITTEN SHORT ANSWER (ids 36 to 50)
══════════════════════════════════════════
• Every question requires a minimum 3–5 sentence analytical response
• NEVER ask simple recall — every question must require analysis, synthesis, or evaluation
• Use question types: Explain the mechanism of X and why it produces outcome Y. Compare X and Y and discuss their implications. Evaluate the strengths and limitations of theory/model X. Apply concept X to a new scenario. What would happen if condition Z changed and why? Critically assess the evidence for claim X.
• Model answer: 4–6 dense, accurate, fully analytical sentences
• Key points: exact concepts the student MUST mention to earn full marks

══════════════════════════════════════════
OUTPUT — RETURN ONLY VALID JSON. NO TEXT BEFORE OR AFTER. NO MARKDOWN FENCES.
══════════════════════════════════════════

{
  "mcq": [
    {
      "id": 1,
      "question": "Full precise question text",
      "options": { "A": "Option text", "B": "Option text", "C": "Option text", "D": "Option text" },
      "correctAnswer": "B",
      "explanation": "B is correct because [reason]. A is wrong because [reason]. C is wrong because [reason]. D is wrong because [reason].",
      "category": "Topic label from document"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] for the missing term.",
      "correctAnswer": "exact term only",
      "explanation": "Why this is the only correct answer.",
      "category": "Topic label from document"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Hard analytical question requiring a full written response.",
      "modelAnswer": "Complete 4–6 sentence model answer covering all key analytical points.",
      "keyPoints": ["Concept 1 student must address", "Concept 2 student must address", "Concept 3 student must address"],
      "category": "Topic label from document"
    }
  ]
}`;

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
    console.error("Exam generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate exam" },
      { status: 500 },
    );
  }
}
