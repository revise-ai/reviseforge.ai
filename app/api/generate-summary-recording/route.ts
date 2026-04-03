import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GenerationSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = GenerationSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { audioBase64, mimeType, transcript, userQuery } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-summary-recording");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!audioBase64 && !transcript) {
      return NextResponse.json(
        {
          error:
            "No audio or transcript provided. Please record something first.",
        },
        { status: 400 },
      );
    }

    const prompt = userQuery
      ? `You are ReviseForge AI — a world-class academic tutor and master transcription analyst. The student has recorded a lecture and has asked: "${userQuery}".

### REVISEFORGE EXCELLENCE FRAMEWORK:
1. **Source Fidelity**: Analyze the recording deeply. Answer based exclusively on its content. Reference **timestamps** (e.g., "At 04:30...") where appropriate.
2. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for organization.
   - Use **LaTeX** for ALL mathematical, scientific, and technical notations ($...$ for inline, $$...$$ for block).
   - **No Meta-Commentary**.
3. **Structure & Logic**:
   - Provide a **Step-by-Step** breakdown for processes or complex arguments.
   - Summarize with a **Key Takeaway** section.
4. **Tone**: Expert, professional, and clear.

Sign off as ReviseForge AI.`
      : `You are ReviseForge AI — a world-class academic tutor and master educator. Your mission is to produce an elite, structured, and pedagogical study summary from this recorded lecture.

### REVISEFORGE EXCELLENCE FRAMEWORK (RECORDING SUMMARY STRUCTURE):
1. **### Overview**: A high-level description of the recording's core objective, the speaker's mission, and the target audience.
2. **### Key Concepts (LaTeX Mandated)**: Identify 5-8 critical ideas. Explain each using specific speaker terminology. Use **LaTeX** for every scientific or technical notation.
3. **### Core Pedagogical Breakdown**: A deep-dive into the main facts, theories, or arguments presented in the recording.
4. **### Step-by-Step Mechanism**: If the speaker describes a process or sequence, break it down into logical, numbered actions.
5. **### Synthesis & Context**: How these concepts relate to the broader subject area or real-world application.
6. **### Key Takeaways**: 3-5 high-impact, actionable points to remember from the lecture.
7. **Notable Metaphors & Quotes**: Highlight specific analogies, cases, or memorable statements used by the speaker to aid memory. Include approximate timestamps.

### FORMATTING RULES:
- **Headers**: Use ### for all sections.
- **Emphasis**: Use **BOLD** for critical terms.
- **Math/Science**: Use **$ ... $** for inline and **$$ ... $$** for block LaTeX.
- **No Meta-Commentary**: Start immediately with the Overview.

Sign off as ReviseForge AI.`;

    let contents: any[];

    if (audioBase64 && mimeType) {
      // ── Path A: real audio blob from the recording ────────────────────────
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
      // ── Path B: fallback to transcript text ───────────────────────────────
      const transcriptContext = `The following is a transcript of the recorded lecture. Use it as the sole source of content for the summary.\n\n${transcript}\n\n`;
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
        { status: 500 },
      );
    }

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error(`Summary recording generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("quota") || error?.message?.includes("429")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate summary" },
      { status: 500 },
    );
  }
}
