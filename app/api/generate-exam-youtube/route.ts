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

  const blocked = await applyRateLimit(req, RATE_LIMITS.generation, "generate-exam-youtube");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    if (!url)
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const prompt = `You are ReviseForge AI — an elite, merciless university examination architect. Your mission is to watch this entire YouTube video and produce a high-stakes formal exam that tests the absolute limits of a student's conceptual mastery.

### CRITICAL BANS (ZERO TOLERANCE):
- Video metadata (title, channel, presenter, date, creator).
- Trivial recall or general knowledge.
- "All/None of the above" options.

### REVISEFORGE EXCELLENCE FRAMEWORK (EXAM RIGOR):
Every question must demand elite cognitive effort:
1. **Multi-Step Reasoning**: Connecting disparate technical points from the video.
2. **Nuance Distinction**: Precise differentiation between plausible technicalities mentioned by the speaker.
3. **Inverse Reasoning**: Analyzing counter-factuals based on video content.
4. **Causal Depth**: Mastery of the underlying "Why."
5. **Synthesis**: Combining information from different timestamps into a single solution.

### FORMATTING STANDARDS (CRITICAL):
- **LaTeX Mandated**: Use LaTeX for ALL mathematical expressions, chemical formulas, and technical variables ($...$ for inline, $$...$$ for block).
- **Markdown Headers**: Use ### inside explanations and model answers.
- **Strict JSON**: Return ONLY a valid JSON object. No meta-commentary.

### EXAM STRUCTURE:
- **Section 1: 20 MCQ**: High-rigor, plausible distractors, depth-focused.
- **Section 2: 15 Fill-in-the-Blank**: Target precise technical terms, statistics, or formula components from the video.
- **Section 3: 15 Written Short Answer**: Analytical, evaluation-based questions (3–5 sentence responses) referencing video logic.

### OUTPUT SCHEMA (JSON ONLY):
{
  "mcq": [
    {
      "id": 1,
      "question": "Precise question with LaTeX.",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correctAnswer": "B",
      "explanation": "### Logic\nDetailed reasoning based on video timestamps using LaTeX.",
      "category": "Topic"
    }
  ],
  "fillInBlank": [
    {
      "id": 21,
      "question": "Sentence with exactly one [BLANK] for a term from the video.",
      "correctAnswer": "term",
      "explanation": "Pedagogical reason for this term based on the video.",
      "category": "Topic"
    }
  ],
  "written": [
    {
      "id": 36,
      "question": "Critical analytical question about video content.",
      "modelAnswer": "### Model Response\nElite 4–6 sentence response referencing video logic with LaTeX.",
      "keyPoints": ["Must address X from the video", "Must address Y from the video"],
      "category": "Topic"
    }
  ]
}

The rigor must be world-class. Producde the hardest possible exam based on this video.`;

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

    let exam;
    try {
      exam = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) exam = JSON.parse(match[0]);
      else throw new Error("Could not parse exam JSON from Gemini response");
    }

    return NextResponse.json({ exam });
  } catch (error: any) {
    console.error(`Exam generation error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}
