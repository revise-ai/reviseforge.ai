// File path: app/api/chat-general/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { question, history } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    // Build conversation context from the last few messages
    const historyContext = history && history.length > 0
      ? `\n\nPrevious conversation:\n${
          history
            .slice(-6)
            .map((m: { role: string; message: string }) =>
              `${m.role === "user" ? "Student" : "AI"}: ${m.message}`
            )
            .join("\n")
        }\n`
      : "";

    const prompt = `You are a knowledgeable, friendly AI study assistant. A student has typed a question directly into the study platform.
${historyContext}
Student's question: "${question}"

Instructions:
- Answer the student's question thoroughly and helpfully.
- If the question is about a subject or topic, explain it clearly with examples where relevant.
- If the question asks you to quiz them, generate a few relevant questions.
- If the question asks you to summarise a topic, provide a clear, structured summary.
- If the student references something from the conversation above, use that context naturally.
- If the question is about a YouTube video or file they mentioned uploading, acknowledge it and help accordingly.
- Write in clear, plain prose. No asterisks, no hashtags, no bullet symbols.
- Be concise for simple questions (3–5 sentences) and thorough for complex ones.
- Be warm and encouraging — you are a study assistant helping someone learn.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const answer = response.text ?? "";

    if (!answer) {
      return NextResponse.json(
        { error: "No answer was generated. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer });

  } catch (error: any) {
    console.error("Chat general error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to answer question" },
      { status: 500 }
    );
  }
}