// File path: app/api/chat-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ChatSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = ChatSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { audioBase64, mimeType, transcript, question, history } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.chat, "chat-recording");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
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

    const prompt = `You are ReviseForge AI — an elite academic tutor and master transcription assistant. A student has recorded a lecture and has asked a question. Your mission is to provide an elite, pedagogical answer based exclusively on the recording, while ensuring any transcribed thoughts are clean and professional.

### MISSION A: TRANSCRIPTION CLEANING (CRITICAL)
- **Remove** all filler words ("um," "uh," "like," "you know") and consecutive repetitions.
- **Self-Correction**: Keep ONLY the final intended version of a thought.
- **Structure (The Look)**: Identify lists, processes, and distinct thoughts. Format them using Markdown headers, bullet points, or numbered steps.
- **Precision**: If a technical term is mentioned, ensure it is spelled correctly (e.g., "Mitochondria," "Statute of Frauds").

### MISSION B: REVISEFORGE EXCELLENCE FRAMEWORK (ELITE TUTORING)
1. **Source Fidelity**: Analyze the recording deeply. Answer based exclusively on its content. Reference **timestamps** (e.g., "At 04:30 in the recording...") where possible.
2. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for organization.
   - Use **LaTeX** for ALL mathematical, scientific, and technical notations.
   - **Inline Math**: Use $ ... $ for variables and small formulas.
   - **Block Math**: Use $$ ... $$ for calculations or centered formulas.
   - **No Meta-Commentary**: Get straight to the teaching.
3. **Structure & Logic**:
   - **Step-by-Step Breakdown**: Mandatory for calculations or procedures.
   - **The "Why"**: Explain the underlying mechanism or logic discussed by the speaker.
   - **Key Lesson**: Always conclude with a "Summary" or "Key Takeaway" section.
4. **Tone**: Expert, professional, and clear. Avoid casual prose; use structure to aid learning.

${historyContext}
Student's question: "${question}"

Sign off as ReviseForge AI.`;

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
    console.error(`Chat recording error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to answer question" },
      { status: 500 },
    );
  }
}