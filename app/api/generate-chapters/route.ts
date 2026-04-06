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

    const prompt = `You are ReviseForge AI — a world-class academic tutor and master educator. Your mission is to analyze this media (video or audio) and extract professional, pedagogical chapters and an exhaustive, HIGH-FIDELITY, verbatim transcript.

### MISSION A: PEDAGOGICAL CHAPTERING (EXHAUSTIVE)
Analyze the semantic structure of the media. Identify EVERY logical topic shift.
- **Detailed Chapters**: Produce 8-15 distinct chapters.
- **Elite Titles**: Academic, precise, and professional.
- **Pedagogical Narratives**: For each chapter, provide a 4-5 sentence summary explaining the core concepts, educational takeaways, and critical analysis. Use **LaTeX** for ALL mathematical/scientific notation.
- If the media is a YouTube video, use its NATIVE chapters (if visible in metadata/dialogue) as a foundation but expand them with elite pedagogy.

### MISSION B: ABSOLUTE VERBATIM TRANSCRIPT (HIGH-DENSITY)
Produce a literal, word-for-word transcript segment EVERY 10 seconds.
- **Verbatim Accuracy**: This is non-negotiable. Every "uh", "um", and repetition should be omitted, but every meaningful word must be captured exactly.
- **Technical Precision**: Correctly identify and spell complex terminology, proper nouns, and academic jargon.
- **Frequency**: Ensure segments are dense. Do NOT summarize or skip dialogue.
- **NO LaTeX** in transcript text.

### OUTPUT FORMAT (JSON ONLY):
{
  "title": "A highly descriptive, academic title for this recording",
  "chapters": [{ "time": "00:00", "title": "Topical Heading", "text": "Deep educational breakdown..." }],
  "transcripts": [{ "time": "00:00", "text": "The spoken words starting at this timestamp..." }]
}

You MUST follow this JSON schema exactly. NO conversational filler.`;

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
        const genModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        response = await genModel.generateContent(parts);
        break;
      } catch (err: any) {
        const shouldRetry = (
          err?.message?.includes("503") || 
          err?.message?.includes("500") || 
          err?.message?.includes("429") || 
          err?.message?.includes("quota") || 
          err?.status === 503 || 
          err?.status === 429
        );
        
        if (shouldRetry) {
          attempt++;
          if (attempt >= 5) throw err;
          // Exponential backoff: 2s, 4s, 8s, 16s...
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`Chapters API error. Retrying in ${delay}ms... (Attempt ${attempt}/5)`);
          await new Promise(r => setTimeout(r, delay));
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
