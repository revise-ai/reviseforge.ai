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

    const prompt = `You are ReviseForge AI — a world-class academic tutor and subject matter expert. The student is watching this YouTube video and has asked a question. Your mission is to provide an elite, pedagogical answer based strictly on the video content, using the ReviseForge Excellence Framework.

${historyContext}

Student's Question: "${question}"

### REVISEFORGE EXCELLENCE FRAMEWORK:
1. **Source Fidelity**: Analyze the video deeply. Answer based exclusively on its content. Reference specific **timestamps** (e.g., "At 2:45, the speaker explains...") or chapters where appropriate.
2. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for organization.
   - Use **LaTeX** for ALL mathematical, scientific, and technical notations.
   - **Inline Math**: Use $ ... $ for variables and small formulas (e.g., $x$, $\text{H}_2\text{O}$).
   - **Block Math**: Use $$ ... $$ for major steps or centered formulas.
   - **Chemical Structures**: If visualizing or drawing a chemical structure/molecule, output the exact SMILES string enclosed in a \`\`\`smiles code block. Do NOT use ASCII art or raw SVGs.
   - **No Meta-Commentary**: Get straight to the teaching. Do not say "Based on the video..." as an opening.
3. **Structure & Logic**:
   - **Step-by-Step Breakdown**: If the question involves a process, calculation, or complex argument, break it down into logical steps.
   - **The "Why"**: Explain the underlying mechanism or logic behind the speaker's points.
   - **Summary/Takeaway**: Always conclude with a "Key Lesson" or "Summary" section.
4. **Tone**: Expert, professional, and clear. Avoid casual prose; use structure to aid learning.

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
