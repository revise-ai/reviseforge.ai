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

    const prompt = `Watch this entire YouTube video from start to finish before doing anything else.

You must extract two things: accurate chapters and a word-for-word transcript broken into segments.

CHAPTERS:
Identify 5 to 10 natural topic breaks — moments where the speaker genuinely shifts to a new idea, concept, or section. Each chapter must:
- Have a timestamp in MM:SS format that exactly matches when the new topic begins
- Have a title that names the specific topic covered (not vague titles like "Introduction" or "Part 1")
- Have a description of 2 to 3 sentences explaining precisely what the speaker covers in that section — based only on what is actually said

Do not invent chapters. Do not create chapters for transitions, greetings, or filler. Only create a chapter when there is a genuine shift in subject matter.

TRANSCRIPT:
Produce a rolling transcript of the spoken audio. Create one entry every 20 to 30 seconds. Each entry must:
- Have a timestamp in MM:SS format
- Contain the actual spoken words from the video at that moment — as close to verbatim as possible
- Cover the full video from beginning to end with no gaps

Do not summarise or paraphrase the transcript entries. Write what was actually said.

Return only a valid JSON object. No text before or after. No markdown code fences. No explanation. Use this exact structure:

{
  "title": "The full title of the video",
  "duration": "Total video duration as MM:SS",
  "chapters": [
    {
      "time": "00:00",
      "title": "Specific descriptive chapter title",
      "text": "2 to 3 sentences describing exactly what is covered in this section based on what the speaker says"
    }
  ],
  "transcripts": [
    {
      "time": "00:00",
      "text": "The actual spoken words from the video at this timestamp"
    }
  ]
}`;

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
