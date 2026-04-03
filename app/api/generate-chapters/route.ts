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
  const { url } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-chapters");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!url)
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master educator. Your mission is to watch this entire YouTube video and extract professional, pedagogical chapters and a clean transcript.

### MISSION A: PEDAGOGICAL CHAPTERING
Identify 5 to 10 natural topic breaks. Each chapter must:
- Have a timestamp in MM:SS format.
- Have an **Elite Title**: Professional and descriptive (e.g., "The Mechanism of Cellular Respiration" instead of "Part 1").
- Have a **Pedagogical Description**: 2-3 sentences explaining exactly what is covered. Use **LaTeX** for every mathematical or scientific notation ($...$ for inline, $$...$$ for block).
- Focus on subject matter shifts, not greetings or transitions.

### MISSION B: CLEAN TRANSCRIPT
Produce a verbatim transcript segment every 20 to 30 seconds.
- Match MM:SS timestamps.
- Clean language: Correct technical spellings but stay true to the speaker's words.

### OUTPUT FORMAT (JSON ONLY):
{
  "title": "Professional title of the video",
  "duration": "Duration in MM:SS",
  "chapters": [
    {
      "time": "00:00",
      "title": "Elite Chapter Title",
      "text": "Pedagogical description with LaTeX for technical terms."
    }
  ],
  "transcripts": [
    {
      "time": "00:00",
      "text": "Verbatim spoken words."
    }
  ]
}

Ensure the output is ONLY valid JSON. No meta-commentary or markdown fences.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ fileData: { fileUri: url } }, { text: prompt }],
        },
      ],
    });

    const rawText = response.text ?? "";
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else
        throw new Error("Could not parse chapters JSON from Gemini response");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Chapters generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
