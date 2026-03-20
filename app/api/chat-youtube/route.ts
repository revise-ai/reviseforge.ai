// File path: app/api/chat-youtube/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { url, question, history } = await req.json();

    if (!url)
      return NextResponse.json(
        { error: "No video URL provided" },
        { status: 400 },
      );
    if (!question)
      return NextResponse.json(
        { error: "No question provided" },
        { status: 400 },
      );

    // Last 6 messages give the AI memory of the conversation without
    // blowing up the token limit
    const historyContext =
      history && history.length > 0
        ? `\n\nPrevious conversation in this session:\n${history
            .slice(-6)
            .map(
              (m: { role: string; message: string }) =>
                `${m.role === "user" ? "Student" : "AI"}: ${m.message}`,
            )
            .join("\n")}\n`
        : "";

    const prompt = `You are a knowledgeable study assistant. The student is watching this YouTube video and has typed a question in the chat input.
${historyContext}
Student's question: "${question}"

Instructions:
- Watch the full video and answer based exclusively on its content.
- If the question references a timestamp like "at 2:30" or "around 5 minutes in", focus on what the speaker says at that moment.
- If the question references a chapter, topic, or section title, explain what is covered there in detail.
- If the question is conceptual, use the exact examples, terminology, and explanations from the video.
- If the student asks something not covered in the video at all, say so clearly and briefly.
- If the student is following up on a previous message from the conversation above, acknowledge that context naturally.
- If the student asks you to summarise something, quiz them, or explain a concept from the video — do it directly in your answer.
- Write in clear, plain prose. No asterisks, no hashtags, no bullet symbols.
- Be specific — reference actual moments, examples, and explanations from the video.
- Keep the answer focused: 3 to 6 sentences for simple questions, longer only if the question genuinely requires depth.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ fileData: { fileUri: url } }, { text: prompt }],
        },
      ],
    });

    const answer = response.text ?? "";

    if (!answer) {
      return NextResponse.json(
        { error: "No answer was generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("Chat YouTube error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to answer question" },
      { status: 500 },
    );
  }
}
