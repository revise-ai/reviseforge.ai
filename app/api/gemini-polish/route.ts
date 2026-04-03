// File path: app/api/gemini-polish/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { UtilitySchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildPolishOnlyPrompt(noteContent: string): string {
  return `You are ReviseForge AI — an elite academic tutor and master editor. Your mission is to transform the student's note into a professional, pedagogical study resource.

### MISSION:
1. **Polish**: Correct all grammar, syntax, and flow issues while preserving 100% of the student's original insights.
2. **Pedagogical Enrichment**: Where a technical concept or term is mentioned, add a brief, high-impact clarification or a **Step-by-Step** breakdown ($the "why"$) to aid learning.
3. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for logical categorization.
   - Use **LaTeX** for ALL mathematical, scientific, and technical notations.
   - **Inline Math**: Use $ ... $ for variables, formulas, and units.
   - **Block Math**: Use $$ ... $$ for calculations or centered equations.
4. **Elite Structure**: Avoid walls of text. Use bullet points and headers to aid visual learning.

### STRICT RULES:
- Return ONLY the polished note text. No meta-commentary or preambles.
- No markdown fences around the result.

Student's note to polish:
${noteContent}`;
}

function buildPolishWithResourcePrompt(noteContent: string): string {
  return `You are ReviseForge AI — an elite academic tutor and subject matter expert. Your mission is to enrich the student's note using the provided supplementary resource (video or document), creating a unified, expert study document.

### ENRICHMENT GUIDELINES:
1. **Synthesize**: Deeply integrate relevant definitions, theories, and laws from the resource into the student's note.
2. **Pedagogical Depth**: If the resource explains a mechanism or process, provide a **Step-by-Step** anatomical or logical breakdown ($LaTeX mandated$).
3. **Formatting Standards (CRITICAL)**:
   - Use **Markdown headers** (###) for structure.
   - Use **LaTeX** for ALL math, science, and technical expressions ($ ... $ for inline, $$ ... $$ for block).
4. **Preservation**: Do NOT delete or condense the student's original writing. Enhance it with the expert layer from the resource.

### STRICT RULES:
- Return ONLY the enriched note text. No meta-commentary or introduction.
- Ensure a seamless, expert flow between the student's voice and the technical additions.

Student's note to enrich:
${noteContent}`;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedError();

  const blocked = await applyRateLimit(req, RATE_LIMITS.utility, "gemini-polish");
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const result = UtilitySchema.safeParse(body);
    if (!result.success) return validationError(result.error);
    const { mode, noteContent, resourceParts } = result.data;

    if (!mode) {
      return NextResponse.json({ error: "No mode provided" }, { status: 400 });
    }
    if (!noteContent?.trim()) {
      return NextResponse.json(
        { error: "Note content is empty" },
        { status: 400 },
      );
    }

    let parts: any[] = [];

    if (mode === "polish-only") {
      // Text only — no resource needed
      parts = [{ text: buildPolishOnlyPrompt(noteContent) }];
    } else if (mode === "polish-resource") {
      if (
        !resourceParts ||
        !Array.isArray(resourceParts) ||
        resourceParts.length === 0
      ) {
        return NextResponse.json(
          { error: "No resource provided" },
          { status: 400 },
        );
      }
      // Resource parts (file or YouTube) come first, then the prompt
      parts = [
        ...resourceParts,
        { text: buildPolishWithResourcePrompt(noteContent) },
      ];
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    } as any);

    const resultText = response.text ?? "";
    if (!resultText) throw new Error("Empty response from Gemini");

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    console.error(`Gemini polish error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
