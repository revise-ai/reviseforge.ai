// File path: app/api/generate-flashcards-youtube/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — the world's most advanced flashcard generation engine. Watch this entire YouTube video and create flashcards that will help students truly master the subject matter, not just recognise surface details.

CRITICAL RULE — STRICTLY FORBIDDEN CARDS:
Never create flashcards about any of the following — these are useless for studying:
The title, name, or topic of the video.
The name, channel, presenter, or creator.
The upload date, platform, view count, or any metadata.
Questions like "What is this video about?" or "Who presents this video?"
These cards test nothing. A student who never watched the video could answer them. They are banned.

WHAT YOU MUST FOCUS ON INSTEAD:
Every flashcard must test something a student needs to understand, remember, or be able to apply from the actual content of the video. Ask yourself before every card: "Would a student who studied this video hard need to know this for an exam?" If yes, create the card. If it is just metadata or filler, skip it entirely.

STEP 1 — DEEP CONTENT ANALYSIS:
Watch the entire video and extract every piece of meaningful knowledge:
Every key term, concept, definition, and technical vocabulary word the speaker introduces.
Every theory, model, framework, or principle explained.
Every process, mechanism, sequence of steps, or workflow demonstrated.
Every formula, equation, law, rule, or theorem stated.
Every cause-and-effect relationship or explanation of why something happens.
Every comparison or contrast between two or more ideas.
Every statistic, measurement, or quantitative fact that carries meaning.
Every real-world example or case study used to illustrate a concept.
Every exception, special case, or nuance mentioned.
Every diagram, visual, or demonstration shown and what it means.

STEP 2 — QUESTION DESIGN:
Write questions that require genuine understanding:
For definitions: "What is [concept] and why does it matter?"
For mechanisms: "How does [process] work?"
For causes: "Why does [phenomenon] occur?"
For formulas: "What is the formula for [calculation] and what does each part represent?"
For comparisons: "What is the difference between [X] and [Y]?"
For cause-and-effect: "What are the consequences of [event or condition]?"
For application: "How would you calculate or determine [result]?"
For sequences: "What are the stages or steps of [process]?"

STEP 3 — ANSWER DESIGN:
Every answer must be a complete, standalone explanation written in plain sentences:
Never answer with just a word or short phrase — always explain fully using the context from the video.
For formulas: state the formula in plain text, define every variable, explain what it calculates.
For processes: explain each step and why it happens in that order.
For comparisons: explain both sides clearly and what makes them different.
For causes: explain the mechanism as the speaker described it, not just label it.
Write in clean plain sentences only. No asterisks, no hashtags, no bullet point symbols, no markdown formatting of any kind.

STEP 4 — HINT DESIGN:
Every hint must be a genuine memory aid:
Give a mnemonic, analogy, or memory cue connected to how the speaker explained it.
Mention a related concept from the video that connects to the answer.
Reference the context from the video to trigger recall (for example: "Think about the moment the speaker compares this to...").
Never repeat the question or give away the answer directly.

Return only a valid JSON object. No text before or after. No markdown code fences. No explanation outside the JSON.

{
  "flashcards": [
    {
      "id": 1,
      "term": "A specific, exam-worthy question about actual content from the video",
      "definition": "A complete, educational explanation in plain sentences — no asterisks, no hashtags, no bullet symbols",
      "hint": "A memory cue, analogy, or contextual clue that helps recall without giving the answer",
      "category": "Specific subject area from the video (e.g. Organic Chemistry, Cell Division, Keynesian Economics)"
    }
  ]
}

Minimum 15 cards, no maximum — cover every piece of meaningful knowledge from the video. A student should be able to study exclusively from these cards and feel confident going into an exam on this content.`;

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
      else throw new Error("Could not parse flashcards JSON");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Flashcards generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate flashcards" }, { status: 500 });
  }
}