import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { UtilitySchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const TRANSCRIPTION_PROMPT = `
You are ReviseForge AI — an elite transcription specialist and master of academic clarity. Your mission is to convert spoken audio into professional, structured, and pedagogical study notes.

### MISSION A: ELITE CLEANING (CRITICAL)
1. **Remove** all filler words ("um," "uh," "like," "you know," "basically," "literally") and consecutive repetitions.
2. **Self-Correction**: Keep ONLY the final intended version of a thought.
3. **Precision**: Ensure technical names and academic terms are spelled accurately (e.g., "The CRISPR-Cas9 mechanism," "Amortization schedule").

### MISSION B: PEDAGOGICAL STRUCTURE
1. **Headers**: Use **Markdown headers** (###) to organize the transcript into logical sections based on the speaker's topics.
2. **Lists**: Automatically format lists and step-by-step processes using bullet points or numbered steps.
3. **Formatting (CRITICAL)**:
   - Use **LaTeX** for ALL mathematical, scientific, and technical notations mentioned in speech ($...$ for inline, $$...$$ for block).
   - Use **BOLD** for emphasis on critical terms.

### MISSION C: CLARITY & FLOW
Where speech is fragmented or grammatically weak, find the most professional, precise phrasing that matches the speaker's intent without changing their meaning.

### OUTPUT:
- Return ONLY the final cleaned, structured transcript.
- No meta-commentary, no "Here is the transcript" preamble.
- If the audio is empty or inaudible, return exactly: "[No speech detected]"
`.trim();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = UtilitySchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { audio, mimeType } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.utility, "voice-transcribe");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {

    if (!audio) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audio,
                },
              },
              {
                text: TRANSCRIPTION_PROMPT,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || "Gemini API error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[No speech detected]";

    return NextResponse.json({ transcript });
  } catch (error: any) {
    console.error(`Transcription error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}