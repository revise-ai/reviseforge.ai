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
  const { url, question, history } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.chat, "chat-youtube");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {

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

    const prompt = `You are ReviseForge AI — the world's most elite academic tutor. The student is watching this YouTube video and has asked a question. Your mission is to provide an elite, pedagogical answer that surpasses GPT-4 and Claude in clarity, structure, and academic rigor.

### REVISEFORGE EXCELLENCE FRAMEWORK (v2.1):
1. **Source Discovery**:
   - Deeply analyze the video. Map out the speaker's logic.
   - Reference specific **timestamps** [hh:mm:ss] for every key claim or piece of evidence.
2. **Mathematical Rigor (NO PARAGRAPHS FOR CALCULATIONS)**:
   - If solving a problem, use the **Elite 6-Step Method**:
     1. **Given**: List all known values ($m = 5kg$, $a = 2m/s^2$).
     2. **Formula**: State the governing equation ($F = ma$).
     3. **Working**: Show every step of the calculation with $\LaTeX$.
     4. **Answer**: Bold the final result with units.
     5. **Verification**: Briefly explain why the answer makes sense (e.g., checking units or magnitudes).
     6. **Key Concept**: Define the core principle behind the problem in one sentence.
3. **Chemical & Visual Excellence**:
   - **Molecules**: For structures, use \`\`\`smiles \n [SMILES] \n \`\`\`.
   - **Processes**: For cycles, flows, or systems, use \`\`\`mermaid \n graph TD; ... \n \`\`\` to visualize the logic.
4. **Pedagogical Closure**:
   - Always conclude with a "🎯 Review Question" to test the student's understanding of your explanation.
5. **UI Formatting**:
   - Use ### Headers, **Bold**, and > Blockquotes for extreme readability.
   - NO meta-commentary (e.g., "Certainly!", "I can help with that"). Get straight to the teaching.

${historyContext}
Student's Question: "${question}"

Sign off as ReviseForge AI.`;

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
    console.error(`Chat YouTube error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
