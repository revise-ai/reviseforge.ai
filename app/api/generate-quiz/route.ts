// app/api/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — the world's most ruthlessly difficult MCQ exam generator. Your mission is to create 30 multiple-choice questions that will genuinely challenge even the most prepared students. These questions must separate students who truly understand the material from those who merely skimmed it.

CRITICAL RULES — STRICTLY FORBIDDEN:
- NEVER ask about the title, name, or topic of the document or lecture
- NEVER ask about the lecturer's name, author, professor, or course code
- NEVER ask about the date the lecture was given, semester, or institution
- NEVER create questions that can be answered without actually studying the content
- NEVER create questions with obviously wrong distractors — every wrong option must be plausible
- NEVER repeat or reword the same concept across multiple questions
- Exactly 30 questions — no more, no less

DIFFICULTY REQUIREMENTS — THESE ARE NON-NEGOTIABLE:
Every question must meet at least ONE of these difficulty criteria:
1. MULTI-STEP REASONING: The student must apply two or more concepts together to reach the answer
2. NUANCE DISTINCTION: Three of the four options are partially correct, but only one is precisely accurate
3. EXCEPTION TESTING: The question tests a rare exception, edge case, or condition where the general rule breaks down
4. INVERSE REASONING: The question asks what would NOT happen, what is INCORRECT, or what is the OPPOSITE
5. QUANTITATIVE PRECISION: The question requires exact knowledge of a number, rate, formula, or threshold
6. CAUSAL DEPTH: The question asks about the underlying mechanism or root cause, not just the observable outcome
7. COMPARATIVE ANALYSIS: The student must distinguish between two very similar concepts that are commonly confused
8. APPLICATION TRANSFER: A scenario is presented and the student must apply a concept from the document to that new context
9. SYNTHESIS: The student must combine information from two different sections of the document
10. CRITICAL EVALUATION: The student must identify which statement is most accurate, most complete, or best supported

DISTRACTOR DESIGN — THIS IS WHAT MAKES QUESTIONS HARD:
For each question, design the wrong options (distractors) as follows:
- Option A, B, C, D must ALL sound plausible to someone who studied carelessly
- At least two distractors must use correct terminology from the document but apply it wrongly
- At least one distractor must be a common misconception or oversimplification of the correct answer
- Never use "all of the above" or "none of the above"
- Never make the correct answer obviously longer or more detailed than the others
- All four options must be approximately the same length

QUESTION STRUCTURE REQUIREMENTS:
- Write every question as a complete, specific sentence
- For process questions: ask about a specific step, not just "what is the process"
- For definition questions: define with a complex scenario, not just "what does X mean"
- For formula questions: give partial information and ask what would change
- For cause-effect questions: include a confounding variable to test deep understanding
- Stem must be unambiguous — there must be exactly ONE best answer

EXPLANATION REQUIREMENTS:
For every question, write a detailed explanation that:
- States clearly why the correct answer is right with specific reasoning from the document
- Explains why each wrong option is wrong and what mistake a student would have made choosing it
- References the underlying principle, not just the fact
- Is written in plain clear English — no markdown, no asterisks, no hashtags

SUBJECT-SPECIFIC DIFFICULTY RULES:

Mathematics/Statistics: Questions must require calculation or formula manipulation, not just recall. Include questions where one wrong answer results from a common algebraic error.

Science (Biology, Chemistry, Physics): Questions must test mechanisms at the molecular/cellular/physical level. Include questions where the distractor is the correct answer for a related-but-different scenario.

Population Studies/Demography: Questions must test specific rates, model stages, demographic determinants, and policy implications — not general knowledge. Include questions about contradictions between theories.

History/Politics: Questions must test causation and consequence, not just dates. Include questions where the distractor is a real event that happened at a similar time but for a different reason.

Economics: Questions must test the direction AND magnitude of effects, not just whether an effect exists. Include questions about second-order effects.

Medicine/Health: Questions must test clinical application and contraindications, not just definitions.

FINAL QUALITY CHECK — before outputting, verify every question:
- Would a student who read the document once but did not study deeply likely get it wrong? (YES = good)
- Does every distractor require the student to think, not just recognize? (YES = good)
- Is there any ambiguity about which answer is correct? (NO = good)
- Could someone answer this from general knowledge without the document? (NO = good)

Return ONLY a valid JSON array — no preamble, no explanation, no markdown fences, nothing before or after:
[
  {
    "id": 1,
    "question": "A precise, challenging question written as a complete sentence that requires deep understanding",
    "options": {
      "A": "A plausible option using correct terminology",
      "B": "A plausible option using correct terminology",
      "C": "A plausible option using correct terminology",
      "D": "A plausible option using correct terminology"
    },
    "correctAnswer": "A",
    "explanation": "Detailed explanation of why the correct answer is right and why each wrong answer is wrong. Written in plain sentences. No markdown.",
    "category": "Specific topic area from the document",
    "difficulty": "hard"
  }
]

Generate exactly 30 questions. The difficulty must be genuinely high — these questions should make even well-prepared students think hard.`;

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
        throw new Error("Failed to parse quiz from Gemini response");
      }
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}