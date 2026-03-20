// File path: app/api/chat-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, mimeType, transcript, question, history } =
      await req.json();

    if (!question)
      return NextResponse.json(
        { error: "No question provided" },
        { status: 400 },
      );

    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        {
          error:
            "No audio or transcript provided. Please record something first.",
        },
        { status: 400 },
      );
    }

    // Last 6 messages give the AI memory of the conversation
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

    const prompt = `You are a knowledgeable study assistant. The student has recorded a lecture and has typed a question in the chat input.
${historyContext}
Student's question: "${question}"

Instructions:
- Base your answer exclusively on the content of the audio recording provided.
- If the question references a timestamp like "at 2:30" or "around 5 minutes in", focus on what the speaker says at that moment in the recording.
- If the question references a topic or section, explain what is covered there in detail.
- If the question is conceptual, use the exact examples, terminology, and explanations from the recording.
- If the student asks something not covered in the recording at all, say so clearly and briefly.
- If the student is following up on a previous message from the conversation above, acknowledge that context naturally.
- If the student asks you to summarise something, quiz them, or explain a concept from the recording — do it directly in your answer.
- Write in clear, plain prose. No asterisks, no hashtags, no bullet symbols.
- Be specific — reference actual moments, examples, and explanations from the recording.
- Keep the answer focused: 3 to 6 sentences for simple questions, longer only if the question genuinely requires depth.`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob ───────────────────────────────────────────
      // Gemini receives the actual recording and can reference exact moments
      contents = [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType, // e.g. "audio/webm", "audio/mp4", "audio/wav"
                data: audioBase64, // raw base64, no "data:..." prefix
              },
            },
            { text: prompt },
          ],
        },
      ];
    } else {
      // ── Path B: transcript text fallback ──────────────────────────────────
      // Used when audio blob is unavailable (e.g. cleared after processing)
      const transcriptContext = `The following is a transcript of the recorded lecture. Use it as the sole source of content to answer the student.\n\n${transcript}\n\n`;
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

    const answer = response.text ?? "";

    if (!answer) {
      return NextResponse.json(
        { error: "No answer was generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error("Chat recording error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    if (error?.message?.includes("size") || error?.message?.includes("limit")) {
      return NextResponse.json(
        {
          error: "Recording is too large to process. Try a shorter recording.",
        },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to answer question" },
      { status: 500 },
    );
  }
}
