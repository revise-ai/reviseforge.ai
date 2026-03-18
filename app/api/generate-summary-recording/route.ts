// File path: app/api/generate-summary-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType, transcript, userQuery } = await req.json();

    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        { error: "No audio or transcript provided. Please record something first." },
        { status: 400 }
      );
    }

    const prompt = userQuery
      ? `The student has recorded a lecture and has asked the following question: "${userQuery}"

Listen to the full recording and answer their question thoroughly.

If they reference a timestamp (for example "at 2:30" or "around 5 minutes in"), focus on what the speaker says at or near that moment in the recording.
If they reference a topic or section name, explain in detail what is covered in that part.
If they ask a conceptual question, explain the answer using the specific content, examples, and language from the recording.

Write your answer in clear, plain prose. Use a heading if the answer has multiple distinct parts. Be specific — reference actual moments, examples, and explanations from the recording rather than speaking in generalities. Do not use asterisks or hashtags.`

      : `Listen to this entire recorded lecture and produce a thorough study summary. Write everything in clear, flowing prose. Do not use asterisks, hashtags, or bullet symbols anywhere.

Overview

Write 3 to 4 sentences describing what the recording covers, who it is intended for, and its main purpose or argument.

Key Concepts

Identify and explain the 5 to 8 most important concepts, ideas, terms, or frameworks covered in the recording. For each one, write 2 to 3 sentences of explanation grounded in what the speaker actually says — not general knowledge.

Main Points

Write a flowing paragraph or series of short paragraphs covering the core facts, arguments, steps, or information presented across the recording. Cover the full content from start to finish.

Key Takeaways

Write 3 to 5 things a student must remember after listening to this recording. State each one as a clear, specific sentence.

Notable Examples and Quotes

Describe specific examples, demonstrations, case studies, analogies, or memorable statements the speaker uses, with approximate timestamps where possible. Explain why each example matters.

Base everything strictly on the actual content of this specific recording. Do not add outside knowledge. Do not use any markdown formatting symbols.`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob from the recording ────────────────────────
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,          // e.g. "audio/webm", "audio/mp4", "audio/wav"
                data: audioBase64, // raw base64, no "data:..." prefix
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      // ── Path B: fallback to transcript text ───────────────────────────────
      const transcriptContext =
        `The following is a transcript of the recorded lecture. Use it as the sole source of content for the summary.\n\n${transcript}\n\n`;
      contents = [
        {
          role: "user",
          parts: [{ text: transcriptContext + prompt }],
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
    });

    const summary = response.text ?? "";

    if (!summary) {
      return NextResponse.json(
        { error: "No summary was generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });

  } catch (error: any) {
    console.error("Summary recording generation error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (error?.message?.includes("size") || error?.message?.includes("limit")) {
      return NextResponse.json(
        { error: "Recording is too large to process. Try a shorter recording." },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 }
    );
  }
}