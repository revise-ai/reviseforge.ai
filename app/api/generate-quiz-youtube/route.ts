// File path: app/api/generate-quiz-youtube/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — the world's most ruthlessly difficult MCQ exam generator. Watch this entire YouTube video and generate exactly 15 multiple-choice questions that will genuinely challenge even the most prepared students. These questions must separate students who truly understood the video from those who merely watched it passively.

CRITICAL RULES — STRICTLY FORBIDDEN:
Never ask about the video title, channel name, presenter name, upload date, or any metadata.
Never create questions that could be answered without actually watching this specific video.
Never repeat or reword the same concept across multiple questions.
Never use "all of the above" or "none of the above" as options.
Exactly 15 questions — no more, no less.

DIFFICULTY REQUIREMENTS — NON-NEGOTIABLE:
Every question must meet at least one of these criteria:

Multi-step reasoning: The student must apply two or more concepts from different parts of the video together to reach the answer.
Nuance distinction: Three of the four options are partially correct, but only one is precisely accurate.
Exception testing: The question tests a rare exception, edge case, or condition where the general rule breaks down.
Inverse reasoning: The question asks what would NOT happen, what is INCORRECT, or what is the OPPOSITE of what was explained.
Quantitative precision: The question requires exact knowledge of a number, rate, formula, threshold, or specific statistic mentioned in the video.
Causal depth: The question asks about the underlying mechanism or root cause rather than just the observable outcome.
Comparative analysis: The student must distinguish between two similar concepts that are commonly confused, as explained in the video.
Application transfer: A scenario is described and the student must apply a concept from the video to that new situation.
Synthesis: The student must combine information from two different sections or moments of the video.
Critical evaluation: The student must identify which statement is most accurate, most complete, or best supported by what was said in the video.

DISTRACTOR DESIGN — THIS IS WHAT MAKES QUESTIONS HARD:
All four options must sound plausible to someone who watched the video carelessly.
At least two distractors must use correct terminology from the video but apply it wrongly.
At least one distractor must represent a common misconception or oversimplification of the correct answer.
All four options must be approximately the same length so the correct answer does not stand out visually.
Never make the correct answer obviously more detailed or precise than the others.

EXPLANATION REQUIREMENTS:
For every question write a detailed explanation that states clearly why the correct answer is right with specific reasoning from the video content. Explain why each wrong option is wrong and what mistake a student would have made by choosing it. Reference the underlying principle rather than just the bare fact. Write in plain clear sentences. No markdown formatting symbols, no asterisks, no hashtags.

Return only a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON.

{
  "questions": [
    {
      "id": 1,
      "question": "A precise, challenging question written as a complete sentence requiring deep understanding of the video content",
      "options": {
        "A": "A plausible option using correct terminology from the video",
        "B": "A plausible option using correct terminology from the video",
        "C": "A plausible option using correct terminology from the video",
        "D": "A plausible option using correct terminology from the video"
      },
      "correctAnswer": "B",
      "explanation": "Why B is correct with specific reasoning from the video. Why A is wrong and what mistake leads there. Why C is wrong and what mistake leads there. Why D is wrong and what mistake leads there.",
      "category": "Specific topic area from the video",
      "difficulty": "hard"
    }
  ]
}

Generate exactly 15 questions. The difficulty must be genuinely high — these questions should make even students who watched carefully think hard.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: url } },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else throw new Error("Could not parse quiz JSON");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate quiz" }, { status: 500 });
  }
}