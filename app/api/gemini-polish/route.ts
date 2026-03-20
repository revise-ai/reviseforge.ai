// File path: app/api/gemini-polish/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildPolishOnlyPrompt(noteContent: string): string {
  return `You are an expert academic writing assistant and universal subject tutor with mastery across all fields of human knowledge — mathematics, sciences, humanities, languages, medicine, law, engineering, arts, history, philosophy, economics, computer science, linguistics, psychology, sociology, political science, theology, architecture, music theory, and every other discipline ever studied.

You are working on a student's personal notebook note. Your job is to polish and elevate this note WITHOUT removing, replacing, or summarising any of the student's existing content. The note must only grow richer — never shorter.

WHAT YOU MUST DO:
1. Correct every spelling mistake, grammatical error, punctuation issue, and awkward phrasing without changing meaning.
2. Improve sentence clarity — restructure confusing or run-on sentences so they read naturally, precisely, and confidently.
3. Enhance the logical flow — ensure ideas connect smoothly from one to the next so the note reads as a coherent piece of writing.
4. Preserve 100% of the student's original information, facts, examples, and personal insights — do not delete, summarise, condense, or replace any of it.
5. Where a term or concept is mentioned but left unexplained, add a brief, accurate clarification in parentheses or as a follow-on sentence — only where it genuinely helps understanding.
6. Maintain the student's personal voice and tone throughout — this is their notebook, not a published textbook.
7. Use clear paragraphing and natural structure — do not force unnecessary headers or bullet points unless the original already used them.
8. The final output must be equal to or longer in length than the original note — never shorter.

STRICT RULES:
- Do NOT add information that contradicts what the student wrote.
- Do NOT change the subject, topic, or intent of any section of the note.
- Do NOT add excessive filler or padding — every addition must genuinely improve comprehension.
- Do NOT include any meta-commentary, preamble, or explanation of what you changed.
- Do NOT wrap the output in quotes, code blocks, or any formatting markers.
- Return ONLY the polished note text — nothing else before or after it.

Student's note to polish:
${noteContent}`;
}

function buildPolishWithResourcePrompt(noteContent: string): string {
  return `You are an expert academic writing assistant and universal subject tutor with mastery across all fields of human knowledge — mathematics, sciences, humanities, languages, medicine, law, engineering, arts, history, philosophy, economics, computer science, linguistics, psychology, sociology, political science, theology, architecture, music theory, and every other discipline ever studied.

You have been given TWO inputs:
1. A student's personal notebook note — their own writing on a topic.
2. A resource (which may be a PDF document, an audio recording, or a YouTube video) covering the same or a related topic.

Your task is to enrich and expand the student's note by weaving in knowledge from the resource, WITHOUT removing, replacing, or summarising any of the student's existing content.

WHAT YOU MUST DO:
1. Correct every spelling mistake, grammatical error, and awkward phrasing in the student's original note.
2. Preserve 100% of the student's existing content — every fact, example, idea, and personal insight must remain exactly as intended.
3. Deeply analyse the resource — extract all relevant concepts, definitions, formulas, theories, procedures, examples, evidence, arguments, case studies, historical context, and key details that relate to the note's topic.
4. Weave this extracted knowledge naturally into the student's note — expand their existing points with greater depth, precision, and context drawn directly from the resource.
5. Add new sections or paragraphs where the resource covers important aspects of the topic that the student's note did not mention at all.
6. Add relevant definitions for technical terms, annotate formulas with explanations, provide step-by-step breakdowns where applicable, and include specific examples or evidence from the resource.
7. Ensure the final note flows as a single unified, coherent piece of writing — seamlessly blending the student's original voice with the new material from the resource.
8. The final output must be significantly richer, more detailed, and more comprehensive than the student's original note.

STRICT RULES:
- Do NOT replace the student's content with resource content — only add to and around it.
- Do NOT fabricate or invent information that is not present in either the student's note or the resource.
- Do NOT copy large verbatim blocks from the resource — synthesise and integrate the knowledge naturally.
- Do NOT add irrelevant tangents — every addition must directly relate to the topic of the note.
- Do NOT include any meta-commentary, preamble, or explanation of what you changed or added.
- Do NOT wrap the output in quotes, code blocks, or any formatting markers.
- Return ONLY the enriched note text — nothing else before or after it.

Student's note to enrich:
${noteContent}`;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, noteContent, resourceParts } = body;

    if (!mode) {
      return NextResponse.json({ error: "No mode provided" }, { status: 400 });
    }
    if (!noteContent?.trim()) {
      return NextResponse.json(
        { error: "Note content is empty" },
        { status: 400 },
      );
    }

    let parts: any[] = [];

    if (mode === "polish-only") {
      // Text only — no resource needed
      parts = [{ text: buildPolishOnlyPrompt(noteContent) }];
    } else if (mode === "polish-resource") {
      if (
        !resourceParts ||
        !Array.isArray(resourceParts) ||
        resourceParts.length === 0
      ) {
        return NextResponse.json(
          { error: "No resource provided" },
          { status: 400 },
        );
      }
      // Resource parts (file or YouTube) come first, then the prompt
      parts = [
        ...resourceParts,
        { text: buildPolishWithResourcePrompt(noteContent) },
      ];
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    } as any);

    const result = response.text ?? "";
    if (!result) throw new Error("Empty response from Gemini");

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Gemini polish error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to polish note" },
      { status: 500 },
    );
  }
}
