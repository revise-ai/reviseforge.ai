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

    const prompt = `You are ReviseForge AI — the world's most elite academic tutor. A student has recorded a lecture and has asked a question. Your mission is to provide an elite, pedagogical answer that surpasses GPT-4 and Claude in clarity, structure, and academic rigor.

### MISSION A: TRANSCRIPTION CLEANING
- **Remove** all filler words ("um," "uh," "like," "you know") and repetitions.
- **Precision**: Ensure all technical terms and names are spelled correctly.
- **Structure**: Break down the speaker's thoughts into logical headers and bullet points.

### MISSION B: REVISEFORGE EXCELLENCE FRAMEWORK (v2.1):
1. **Source Discovery**:
   - Deeply analyze the recording. Map out the speaker's logic.
   - Reference specific **timestamps** [hh:mm:ss] for every key claim.
2. **Mathematical Rigor (NO PARAGRAPHS FOR CALCULATIONS)**:
   - Use the **Elite 6-Step Method**:
     1. **Given**: List all known values ($m = 5kg$).
     2. **Formula**: State the governing equation ($F = ma$).
     3. **Working**: Show every step of the calculation with $\LaTeX$.
     4. **Answer**: Bold the final result with units.
     5. **Verification**: Explain why the answer holds up.
     6. **Key Concept**: Define the core principle.
3. **Chemical & Visual Excellence**:
   - Molecules: \`\`\`smiles \n [SMILES] \n \`\`\`.
   - Processes: \`\`\`mermaid \n graph TD; ... \n \`\`\`.
4. **Pedagogical Closure**:
   - Conclude with a "🎯 Review Question" to test the student.
5. **UI Formatting**:
   - Use ### Headers, **Bold**, and > Blockquotes. NO meta-commentary.

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