// File path: app/api/generate-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { url, userQuery } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = userQuery
      ? `The user is watching this YouTube video and has asked the following question: "${userQuery}"

Watch the full video and answer their question thoroughly.

If they reference a timestamp (for example "at 2:30" or "around 5 minutes in"), focus on what the speaker says at or near that moment in the video.
If they reference a chapter title or topic name, explain in detail what is covered in that section.
If they ask a conceptual question, explain the answer using the specific content, examples, and language from the video.

Write your answer in clear, plain prose. Use a heading if the answer has multiple distinct parts. Be specific — reference actual moments, examples, and explanations from the video rather than speaking in generalities. Do not use asterisks or hashtags.`

      : `Watch this entire YouTube video and produce a thorough study summary. Write everything in clear, flowing prose. Do not use asterisks, hashtags, or bullet symbols anywhere.

Overview

Write 3 to 4 sentences describing what the video covers, who it is intended for, and its main purpose or argument.

Key Concepts

Identify and explain the 5 to 8 most important concepts, ideas, terms, or frameworks covered in the video. For each one, write 2 to 3 sentences of explanation grounded in what the speaker actually says — not general knowledge.

Main Points

Write a flowing paragraph or series of short paragraphs covering the core facts, arguments, steps, or information presented across the video. Cover the full content from start to finish.

Key Takeaways

Write 3 to 5 things a student must remember after watching this video. State each one as a clear, specific sentence.

Notable Examples and Quotes

Describe specific examples, demonstrations, case studies, analogies, or memorable statements the speaker uses, with approximate timestamps where possible. Explain why each example matters.

Base everything strictly on the actual content of this specific video. Do not add outside knowledge. Do not use any markdown formatting symbols.`;

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

    const summary = response.text ?? "";
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Summary generation error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate summary" }, { status: 500 });
  }
}