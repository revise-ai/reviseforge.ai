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
  const { url, userQuery } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-summary");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!url)
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = userQuery
      ? `You are ReviseForge AI — a world-class academic tutor and subject matter expert. The user is watching this YouTube video and has asked: "${userQuery}".
      
### REVISEFORGE EXCELLENCE FRAMEWORK:
1. **Source Fidelity**: Analyze the video deeply. Answer based exclusively on its content. Reference **timestamps** (e.g., "At 2:45...") where appropriate.
2. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for organization.
3. **Structure & Logic**:
   - Provide a **Step-by-Step** breakdown for processes or complex arguments.
   - Summarize with a **Key Takeaway** section.
4. **Tone**: Expert, professional, and clear.

Sign off as ReviseForge AI.`
      : `You are ReviseForge AI — a world-class academic tutor and master educator. Your mission is to produce an elite, structured, and pedagogical study summary from this video.

### REVISEFORGE EXCELLENCE FRAMEWORK (SUMMARY STRUCTURE):
1. **### Overview**: A high-level description of the video's core objective and target audience.
2. **### Key Concepts (LaTeX Mandated)**: Identify 5-8 critical ideas. Explain each using specific speaker terminology. Use **LaTeX** for every scientific or technical notation.
3. **### Core Pedagogical Breakdown**: A deep-dive into the main facts, theories, or arguments presented.
4. **### Step-by-Step Mechanism**: If the video teaches a process, break it down into logical, numbered actions.
5. **### Synthesis & Application**: How these concepts relate to the broader subject area.
6. **### Key Takeaways**: 3-5 high-impact, actionable points.
7. **Notable Metaphors**: Highlight specific analogies or cases used by the speaker to aid memory.

### FORMATTING RULES:
- **Headers**: Use ### for all sections.
- **Emphasis**: Use **BOLD** for critical terms.
- **Math/Science**: Use **$ ... $** for inline and **$$ ... $$** for block LaTeX.
- **Chemical Structures**: If visualizing or drawing a chemical structure/molecule, output the exact SMILES string enclosed in a \`\`\`smiles code block. Do NOT use ASCII art or raw SVGs.
- **No Meta-Commentary**: Start immediately with the Overview.

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

    const summary = response.text ?? "";
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error(`Summary generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
