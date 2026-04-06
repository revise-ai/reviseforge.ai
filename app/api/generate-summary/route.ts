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
      ? `You are ReviseForge AI — the world's most elite academic tutor. The user is watching this video and has asked: "${userQuery}". Provide an elite, pedagogical answer.

### REVISEFORGE EXCELLENCE FRAMEWORK (v2.1):
1. **Source Discovery**: Reference specific **timestamps** [hh:mm:ss] for all claims.
2. **Mathematical Rigor**: Use the **Elite 6-Step Method** (Given, Formula, Working, Answer, Verification, Key Concept) for any calculations.
3. **Formatting**: Use ### Headers, **Bold**, and **LaTeX** ($ ... $, $$ ... $$).
4. **Visuals**: Use \`\`\`mermaid\`\`\` for logic flows and \`\`\`smiles\`\`\` for molecules.
5. **No Meta-Commentary**: Get straight to the teaching.

Sign off as ReviseForge AI.`
      : `You are ReviseForge AI — the world's most elite master educator. Your mission is to produce an elite, structured study summary from this video that surpasses all other platforms.

### REVISEFORGE EXCELLENCE FRAMEWORK (v2.1 - SUMMARY STRUCTURE):
1. **### Overview**: A high-level description of the video's core objective and target audience.
2. **### Key Concepts**: Identify 5-8 critical ideas. Explain each using pedagogical precision. Use **LaTeX** ($ ... $) only for mathematical notations or specific technical terms that benefit from it.
3. **### Calculation Breakdown**: If the video performs any math/physics/chemistry calculation, use the **Elite 6-Step Method** (Given, Formula, Working, Answer, Verification, Key Concept) to explain it.
4. **### Molecular Insight**: For any mentioned chemicals, provide their \`\`\`smiles\`\`\` structure.
5. **### Synthesis & Application**: How these concepts relate to the broader subject area.
6. **### Key Takeaways**: 3-5 high-impact, actionable points.
7. **### 🎯 Post-Study Challenge**: Conclude with a high-level reflection question to test the student's mastery.

- **Headers**: Use ### for all sections.
- **Emphasis**: Use **BOLD** for critical terms.
- **Math**: Use **LaTeX** ($ ... $, $$ ... $$) for variables, formulas, and scientific notations.
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
