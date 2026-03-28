import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const TRANSCRIPTION_PROMPT = `
You are an expert transcription and writing assistant. Your job is to convert spoken audio into clean, professional, structured text for a note-taking application.

Follow these rules strictly:

TRANSCRIPTION RULES:
1. Remove all filler words instantly — "um", "uh", "uhh", "like", "you know", "sort of", "kind of", "basically", "literally", "right", "okay so", "so yeah" and any similar hesitation words
2. Remove repeated words and phrases — if the user says the same word or phrase more than once consecutively or within the same thought, keep only one clean instance
3. Detect self-corrections — if the user says something then corrects themselves mid-sentence (e.g. "I went to the— I mean I called the client"), keep ONLY the final intended version and discard the earlier attempt entirely
4. Never add words the user did not say — do not paraphrase or change the meaning, only clean the language

FORMATTING RULES:
5. If the user speaks a list of items, format them as a clean bullet list automatically
6. If the user describes steps or a process, number them as a numbered list
7. If the user speaks in paragraphs or thoughts, organize into clean readable paragraphs with proper punctuation
8. Capitalize the first word of every sentence correctly
9. Add proper punctuation — commas, periods, question marks — where naturally implied by speech
10. If the user mentions a heading or topic title, bold it or place it as a heading

LANGUAGE QUALITY:
11. Where the user's word choice is unclear or weak, find the most precise and professional word that matches their intent — do not change meaning, only improve clarity
12. Keep the user's natural voice and tone — do not make it overly formal unless they are speaking formally

OUTPUT:
- Return ONLY the final cleaned transcript
- Do not include any explanation, commentary, or metadata
- Do not say things like "Here is the transcript" — just return the text directly
- If the audio is empty or completely inaudible, return exactly: "[No speech detected]"
`.trim();

export async function POST(req: NextRequest) {
  try {
    const { audio, mimeType } = await req.json();

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
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}