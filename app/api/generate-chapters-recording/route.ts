import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GenerationSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  text = text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*'([^']*)'/g, (_, val) => `: "${val.replace(/"/g, '\\"')}"`)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\u0000-\u001F\u007F]/g, (ch) =>
      ch === "\n" || ch === "\r" || ch === "\t" ? ch : "",
    );

  try {
    return JSON.parse(text);
  } catch {
    /* continue */
  }

  const fixed = text
    .split("\n")
    .map((line) => line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"))
    .join("\n");

  return JSON.parse(fixed);
}

// ── Convert MM:SS to total seconds ───────────────────────────────────────────
function toSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

// ── Format seconds to MM:SS ───────────────────────────────────────────────────
function toMMSS(secs: number): string {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// ── Strip hallucinated timestamps that exceed actual duration ─────────────────
function clampToDuration(data: any, durationSecs: number | null): any {
  if (!durationSecs || durationSecs <= 0) return data;

  // Filter chapters — remove any whose timestamp exceeds real duration
  if (Array.isArray(data.chapters)) {
    data.chapters = data.chapters.filter((c: any) => {
      const secs = toSeconds(c.time ?? "00:00");
      return secs <= durationSecs;
    });
    // Always keep at least one chapter at 00:00
    if (data.chapters.length === 0 && data.chapters !== undefined) {
      data.chapters = [
        {
          time: "00:00",
          title: "Recording",
          text: "Full content of the recording.",
        },
      ];
    }
  }

  // Filter transcripts — remove any whose timestamp exceeds real duration
  if (Array.isArray(data.transcripts)) {
    data.transcripts = data.transcripts.filter((t: any) => {
      const secs = toSeconds(t.time ?? "00:00");
      return secs <= durationSecs;
    });
  }

  // Correct the duration field to match reality
  data.duration = toMMSS(durationSecs);

  return data;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = GenerationSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { audioBase64, mimeType, durationSecs } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-chapters-recording");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {

    if (!audioBase64 || !mimeType) {
      return NextResponse.json(
        { error: "No audio provided. Please record something first." },
        { status: 400 },
      );
    }

    // Use the client-supplied duration (from MediaRecorder elapsed timer)
    // to enforce accurate timestamps in the prompt and clamp bad ones after
    const knownDuration =
      typeof durationSecs === "number" && durationSecs > 0
        ? durationSecs
        : null;

    const durationNote = knownDuration
      ? `CRITICAL: This recording is exactly ${toMMSS(knownDuration)} (${knownDuration} seconds) long. Every timestamp you produce MUST be between 00:00 and ${toMMSS(knownDuration)}. Any timestamp beyond ${toMMSS(knownDuration)} is wrong and must not appear.`
      : "Use only timestamps that fall within the actual duration of the recording.";

    const transcriptInterval =
      knownDuration && knownDuration < 120
        ? "every 5 to 10 seconds" // short recording — dense transcript
        : "every 20 to 30 seconds"; // longer recording — normal interval

    const chapterNote =
      knownDuration && knownDuration < 60
        ? "Because this recording is under 1 minute, create only 1 chapter starting at 00:00 covering the full content."
        : knownDuration && knownDuration < 180
          ? "Because this recording is under 3 minutes, create 2 to 3 chapters maximum — only where genuine topic shifts occur."
          : "Identify 4 to 8 natural topic breaks where the speaker genuinely shifts to a new idea.";

    const prompt = `You are ReviseForge AI — an elite academic tutor and master transcription analyst. Your mission is to listen to this entire recorded audio and extract professional, pedagogical chapters and a high-fidelity, verbatim transcript.

${durationNote}

### MISSION A: PEDAGOGICAL CHAPTERING
${chapterNote}
Each chapter must:
- Have a timestamp in MM:SS format that EXACTLY matches a real moment in the audio.
- Have an **Elite Title**: Professional and descriptive.
- Have a **Pedagogical Description**: 3-4 sentences explaining exactly what is covered. Use **LaTeX** ONLY for complex mathematical or scientific formulas (e.g., equations, reactions). **NEVER** use LaTeX ($...$) for regular academic terms, concepts, or plain English text.
- Focus on genuine topic shifts.

### MISSION B: HIGH-FIDELITY VERBATIM TRANSCRIPT
Produce a verbatim transcript segment ${transcriptInterval}.
- **Accuracy is the ABSOLUTE Priority**: Every single word must reflect exactly what is spoken. Never summarize. Never paraphrase. Absolute textual fidelity is required.
- Identify and correctly spell all technical, scientific, and academic terms.
- Match MM:SS timestamps exactly.
- **NO LaTeX in Transcripts**: Transcripts must be plain, readable text.

### OUTPUT FORMAT (JSON ONLY):
{
  "title": "Elite Study Guide Title",
  "duration": "${knownDuration ? toMMSS(knownDuration) : "MM:SS"}",
  "chapters": [
    {
      "time": "00:00",
      "title": "Elite Chapter Title",
      "text": "Detailed pedagogical description with LaTeX."
    }
  ],
  "transcripts": [
    {
      "time": "00:00",
      "text": "Verbatim transcript of this audio segment."
    }
  ]
}

Ensure the output is ONLY valid JSON. No meta-commentary or markdown fences.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";

    let data: any;
    try {
      data = extractJSON(rawText);
    } catch (parseErr: any) {
      console.error("Chapters recording JSON parse failed:", parseErr.message);
      console.error("Raw response (first 500 chars):", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse chapters response. Please try again." },
        { status: 500 },
      );
    }

    if (!data?.chapters || !data?.transcripts) {
      return NextResponse.json(
        {
          error:
            "Chapters and transcript were not generated correctly. Please try again.",
        },
        { status: 500 },
      );
    }

    // Clamp any hallucinated timestamps that exceed the real duration
    data = clampToDuration(data, knownDuration);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Chapters recording generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate chapters" },
      { status: 500 },
    );
  }
}
