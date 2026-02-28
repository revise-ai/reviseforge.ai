// File path: app/api/generate-exam-youtube/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — an elite, merciless exam generator. Watch this entire YouTube video from start to finish and produce the hardest possible formal exam a well-prepared student could face based exclusively on what is taught in the video.

ABSOLUTE BANS — ZERO TOLERANCE — NEVER ASK:
The video title, channel name, presenter name, creator name, or their role.
The platform, upload date, view count, or any metadata about the video.
Any question answerable from general knowledge without having watched this specific video.
Any trivial recall question — every question must require understanding, not just memory.

DIFFICULTY REQUIREMENTS — EVERY QUESTION MUST USE AT LEAST ONE:
Multi-step reasoning: the student must chain two or more concepts together to reach the answer.
Nuance distinction: three options are partially correct, only one is fully precise and accurate.
Exception testing: tests an edge case or condition where the general rule breaks down.
Inverse reasoning: asks what would NOT happen, or which statement is INCORRECT.
Quantitative precision: requires an exact number, rate, threshold, ratio, or formula component stated in the video.
Causal depth: asks the underlying mechanism or WHY something happens, not just what happens.
Application transfer: applies a concept from the video to a completely new scenario.
Synthesis: combines information from two different sections or moments of the video.

SECTION 1 — 20 MCQ (ids 1 to 20):
All four options must use correct subject-area terminology from the video — some applied correctly, some subtly wrong.
All four options must be approximately the same length so the correct answer never stands out visually.
At least one distractor per question must represent a common misconception related to the topic.
Every option must sound completely plausible to a student who watched the video carelessly.
Never use "all of the above" or "none of the above".
The explanation must state why the correct answer is right and why each individual wrong option is specifically wrong, with reference to what was actually said in the video.

SECTION 2 — 15 FILL IN THE BLANK (ids 21 to 35):
The blank must target a specific technical term, exact number, formula component, or precise definition word from the video.
The surrounding sentence must provide enough context to be unambiguous but not easy.
There must be only one correct answer — no acceptable synonyms or alternatives.
The correct answer must be one to five words maximum.
It must be impossible to answer correctly without having watched and understood this specific video.

SECTION 3 — 15 WRITTEN SHORT ANSWER (ids 36 to 50):
Every question requires a minimum three to five sentence analytical response.
Never ask simple recall — every question must require analysis, synthesis, or evaluation of content from the video.
Use question types such as: Explain the mechanism of X and why it produces outcome Y. Compare X and Y and discuss their implications. Evaluate the strengths and limitations of theory or model X as explained in the video. Apply concept X from the video to a new scenario. What would happen if condition Z changed and why? Critically assess the evidence for claim X as presented by the speaker.
The model answer must be four to six dense, accurate, fully analytical sentences grounded in what the video actually covers.
Key points must list the exact concepts the student must mention to earn full marks.

Return only a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON.

{
  "mcq": [
    {
      "id": 1,
      "question": "Full precise question text requiring deep understanding of the video content",
      "options": {
        "A": "A plausible option using correct terminology from the video",
        "B": "A plausible option using correct terminology from the video",
        "C": "A plausible option using correct terminology from the video",
        "D": "A plausible option using correct terminology from the video"
      },
      "correctAnswer": "B",
      "explanation": "B is correct because [specific reason from video]. A is wrong because [specific reason]. C is wrong because [specific reason]. D is wrong because [specific reason].",
      "category": "Specific topic area from the video"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] targeting a precise term or value from the video.",
      "correctAnswer": "exact term only",
      "explanation": "Why this is the only correct answer based on what was stated in the video.",
      "category": "Specific topic area from the video"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Hard analytical question requiring a full written response based on the video content.",
      "modelAnswer": "Complete 4 to 6 sentence model answer covering all key analytical points drawn from the video.",
      "keyPoints": ["Concept 1 the student must address", "Concept 2 the student must address", "Concept 3 the student must address"],
      "category": "Specific topic area from the video"
    }
  ]
}`;

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
    return NextResponse.json({ error: error.message || "Failed to generate exam" }, { status: 500 });
  }
}