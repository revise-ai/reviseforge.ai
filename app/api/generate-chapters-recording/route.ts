// File path: app/api/generate-chapters-recording/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Robust JSON extractor ─────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try { return JSON.parse(text); } catch { /* continue */ }

  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  text = text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/:\s*'([^']*)'/g, (_, val) => `: "${val.replace(/"/g, '\\"')}"`)
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\u0000-\u001F\u007F]/g, (ch) =>
      ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
    );

  try { return JSON.parse(text); } catch { /* continue */ }

  const fixed = text.split("\n").map((line) =>
    line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
  ).join("\n");

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
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = Math.floor(secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ── Strip hallucinated timestamps that exceed actual duration ─────────────────
function clampToDuration(
  data: any,
  durationSecs: number | null
): any {
  if (!durationSecs || durationSecs <= 0) return data;

  // Filter chapters — remove any whose timestamp exceeds real duration
  if (Array.isArray(data.chapters)) {
    data.chapters = data.chapters.filter((c: any) => {
      const secs = toSeconds(c.time ?? "00:00");
      return secs <= durationSecs;
    });
    // Always keep at least one chapter at 00:00
    if (data.chapters.length === 0 && data.chapters !== undefined) {
      data.chapters = [{
        time: "00:00",
        title: "Recording",
        text: "Full content of the recording.",
      }];
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
  try {
    const { audioBase64, mimeType, durationSecs } = await req.json();

    if (!audioBase64 || !mimeType) {
      return NextResponse.json(
        { error: "No audio provided. Please record something first." },
        { status: 400 }
      );
    }

    // Use the client-supplied duration (from MediaRecorder elapsed timer)
    // to enforce accurate timestamps in the prompt and clamp bad ones after
    const knownDuration = typeof durationSecs === "number" && durationSecs > 0
      ? durationSecs
      : null;

    const durationNote = knownDuration
      ? `CRITICAL: This recording is exactly ${toMMSS(knownDuration)} (${knownDuration} seconds) long. Every timestamp you produce MUST be between 00:00 and ${toMMSS(knownDuration)}. Any timestamp beyond ${toMMSS(knownDuration)} is wrong and must not appear.`
      : "Use only timestamps that fall within the actual duration of the recording.";

    const transcriptInterval = knownDuration && knownDuration < 120
      ? "every 5 to 10 seconds"   // short recording — dense transcript
      : "every 20 to 30 seconds"; // longer recording — normal interval

    const chapterNote = knownDuration && knownDuration < 60
      ? "Because this recording is under 1 minute, create only 1 chapter starting at 00:00 covering the full content."
      : knownDuration && knownDuration < 180
      ? "Because this recording is under 3 minutes, create 2 to 3 chapters maximum — only where genuine topic shifts occur."
      : "Identify 4 to 8 natural topic breaks where the speaker genuinely shifts to a new idea.";

    const prompt = `Listen to this entire recorded audio from start to finish.

${durationNote}

You must produce two things: accurate chapters and a verbatim transcript.

CHAPTERS:
${chapterNote}
Each chapter must:
- Have a timestamp in MM:SS format that EXACTLY matches a real moment in the audio
- Have a title naming the specific topic (not vague like "Introduction" or "Part 1")
- Have 2 to 3 sentences explaining what the speaker covers in that section

Do NOT invent chapters. Do NOT produce timestamps beyond the recording duration. Only create a chapter when there is a genuine shift in subject matter.

TRANSCRIPT:
Produce a verbatim transcript of the spoken words. Create one entry ${transcriptInterval}. Each entry must:
- Have a timestamp in MM:SS format that is within the actual recording duration
- Contain the actual words spoken at that moment — verbatim, not paraphrased
- Cover the full recording from 00:00 to the end with no gaps

IMPORTANT: Return ONLY a valid JSON object. No text before or after. No markdown code fences. Use double quotes for ALL keys and string values. No trailing commas.

{
  "title": "A descriptive title summarising the main topic",
  "duration": "${knownDuration ? toMMSS(knownDuration) : "MM:SS"}",
  "chapters": [
    {
      "time": "00:00",
      "title": "Specific chapter title",
      "text": "2 to 3 sentences about what is covered here"
    }
  ],
  "transcripts": [
    {
      "time": "00:00",
      "text": "The actual words spoken at this timestamp"
    }
  ]
}`;

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
        { status: 500 }
      );
    }

    if (!data?.chapters || !data?.transcripts) {
      return NextResponse.json(
        { error: "Chapters and transcript were not generated correctly. Please try again." },
        { status: 500 }
      );
    }

    // Clamp any hallucinated timestamps that exceed the real duration
    data = clampToDuration(data, knownDuration);

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Chapters recording generation error:", error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (error?.message?.includes("size") || error?.message?.includes("limit")) {
      return NextResponse.json(
        { error: "Recording is too large to process. Try a shorter recording." },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate chapters" },
      { status: 500 }
    );
  }
}