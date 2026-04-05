import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { GenerationSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = GenerationSchema.safeParse(body);
    if (!result.success && !body.base64) return validationError(result.error);
    
    const { url } = result.data || {};
    const base64 = body.base64;
    const mimeType = body.mimeType || "video/mp4";

    const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-chapters");
    if (blocked) return blocked;

    const user = await getServerUser();
    if (!user) return unauthorizedError();

    if (!url && !base64)
      return NextResponse.json({ error: "No URL or base64 data provided" }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master educator. Your mission is to analyze this media (video or audio) and extract professional, pedagogical chapters and a high-fidelity, verbatim transcript.

### MISSION A: PEDAGOGICAL CHAPTERING
Identify 5 to 10 natural topic breaks. Each chapter must:
- Have a timestamp in MM:SS format.
- Have an **Elite Title**: Professional and descriptive.
- Have a **Pedagogical Description**: 3-4 sentences explaining the academic value. Use **LaTeX** ONLY for formulas.
- Focus on subject matter shifts.

### MISSION B: HIGH-FIDELITY VERBATIM TRANSCRIPT
Produce a verbatim transcript segment every 15 to 20 seconds.
- **Accuracy is the Absolute Priority**. Every word must be exactly as spoken.
- Identify and correctly spell all technical and academic terms.
- Match MM:SS timestamps.
- **NO LaTeX in Transcripts**.

### OUTPUT FORMAT (JSON ONLY):
{
  "title": "Title of the media",
  "chapters": [{ "time": "00:00", "title": "...", "text": "..." }],
  "transcripts": [{ "time": "00:00", "text": "..." }]
}

Ensure valid JSON only.`;

    const parts: any[] = [{ text: prompt }];
    if (url) {
      parts.push({ fileData: { fileUri: url, mimeType: mimeType } });
    } else {
      parts.push({
        inlineData: {
          data: base64,
          mimeType: mimeType,
        }
      });
    }

    let response;
    let attempt = 0;
    while (attempt < 5) {
      try {
        response = await model.generateContent(parts);
        break;
      } catch (err: any) {
        if (err?.message?.includes("503") || err?.message?.includes("500") || err?.status === 503) {
          attempt++;
          if (attempt >= 5) throw err;
          // Exponential backoff: 2s, 4s, 8s, 16s
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        } else {
          throw err;
        }
      }
    }
    if (!response) throw new Error("Generation failed after retries.");
    const rawText = response.response.text();
    const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) data = JSON.parse(match[0]);
      else throw new Error("JSON Parse failure");
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error(`Pedagogical Generation error:`, error);
    if (error?.message?.includes("429")) return NextResponse.json({ error: "Quota exceeded" }, { status: 429 });
    return NextResponse.json({ error: "High-fidelity analysis failed. The media may be too large or invalid." }, { status: 500 });
  }
}
