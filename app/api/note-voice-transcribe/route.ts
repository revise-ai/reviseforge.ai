import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { UtilitySchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const TRANSCRIPTION_PROMPT = `
You are an expert transcriptionist. Convert the spoken audio strictly into completely raw, clean text.

### MISSION (CRITICAL)
1. **Clean**: Remove all filler words ("um," "uh," "like") and fix stutters natively. Keep it professional.
2. **Raw Text Only**: Return ONLY the raw transcript text. Do NOT add ANY markdown formatting, DO NOT add "### Speaker Identification", and DO NOT add sections.
3. If the audio is empty or entirely silent, return exactly: "[No speech detected]"
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