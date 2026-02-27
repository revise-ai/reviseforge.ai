// // app/api/generate-flashcards/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     const arrayBuffer = await file.arrayBuffer();
//     const base64Data = Buffer.from(arrayBuffer).toString("base64");
//     const mimeType = file.type || "application/pdf";

//     const prompt = `You are an expert educator and flashcard creator. Analyze this document thoroughly and create comprehensive flashcards covering ALL the content.

// IMPORTANT RULES:
// - Cover every single topic, concept, fact, formula, definition, diagram description, and piece of information in the document
// - For math/science: include formulas, equations, and step-by-step explanations
// - For diagrams/charts: describe what the diagram shows and explain its meaning
// - For history/geography: include dates, names, events, locations
// - Write clean plain text only — NO markdown, NO asterisks (*), NO hashtags (#), NO bullet symbols
// - Each flashcard must be self-contained and educational
// - Make questions specific and answers complete but concise
// - Generate as many cards as needed to cover ALL content (minimum 10, no maximum)

// Return ONLY a valid JSON array with this exact structure, nothing else:
// [
//   {
//     "id": 1,
//     "term": "The question or term here",
//     "definition": "The complete answer or definition here",
//     "hint": "A helpful hint that guides without giving away the answer",
//     "category": "The topic category (e.g. Chemistry, History, Math, etc.)"
//   }
// ]`;

//     const response = await ai.models.generateContent({
//       model: "gemini-3-flash-preview",
//       contents: [
//         {
//           role: "user",
//           parts: [
//             {
//               inlineData: {
//                 mimeType,
//                 data: base64Data,
//               },
//             },
//             { text: prompt },
//           ],
//         },
//       ],
//     });

//     const rawText = response.text ?? "";

//     // Strip any markdown code fences if present
//     const cleaned = rawText
//       .replace(/```json\s*/gi, "")
//       .replace(/```\s*/g, "")
//       .trim();

//     let flashcards;
//     try {
//       flashcards = JSON.parse(cleaned);
//     } catch {
//       // Try to extract JSON array from response
//       const match = cleaned.match(/\[[\s\S]*\]/);
//       if (match) {
//         flashcards = JSON.parse(match[0]);
//       } else {
//         throw new Error("Failed to parse flashcards from Gemini response");
//       }
//     }

//     return NextResponse.json({ flashcards });
//   } catch (error: any) {
//     console.error("Flashcard generation error:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to generate flashcards" },
//       { status: 500 }
//     );
//   }
// }

// app/api/generate-flashcards/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file) {
//       return NextResponse.json({ error: "No file provided" }, { status: 400 });
//     }

//     const arrayBuffer = await file.arrayBuffer();
//     const base64Data = Buffer.from(arrayBuffer).toString("base64");
//     const mimeType = file.type || "application/pdf";

//     const prompt = `You are ReviseForge AI — the world's most advanced flashcard generation engine, built to help students master any subject completely. Your job is to transform this document into the most comprehensive, pedagogically excellent flashcard set ever created.

// ANALYSIS PHASE — before generating, mentally identify:
// - Every key term, concept, definition, and vocabulary word
// - Every process, mechanism, system, or workflow
// - Every formula, equation, law, rule, or theorem
// - Every date, name, event, place, or statistic
// - Every cause-and-effect relationship
// - Every comparison or contrast between ideas
// - Every diagram, chart, table, or figure and what it represents
// - Every example used to explain a concept

// FLASHCARD GENERATION RULES:

// Question (term) design — make questions that:
// - Ask "What is..." for definitions and concepts
// - Ask "How does..." for processes and mechanisms
// - Ask "Why does/did..." for causes and reasoning
// - Ask "What is the formula/equation for..." for math and science
// - Ask "What happened when..." for events and history
// - Ask "Where is/was..." for geography and locations
// - Ask "Who is/was..." for people and their roles
// - Ask "What are the steps to..." for procedures
// - Ask "What does [diagram/figure] show..." for visual content
// - Ask "What is the difference between X and Y..." for comparisons
// - Ask "What are the properties/characteristics of..." for descriptive content
// - Ask "Calculate/Solve..." for math problems with worked examples in the answer

// Answer (definition) design — make answers that:
// - Give a complete, accurate explanation — not just a one-word answer
// - For math/science: show the formula AND explain what each variable means AND give an example if relevant
// - For processes: explain step by step in natural language
// - For diagrams: describe what is shown AND explain its significance
// - For comparisons: clearly state both sides
// - For people/events: give context, not just a name or date
// - Never use asterisks (*), hashtags (#), bullet symbols, or markdown
// - Write in clean plain sentences and paragraphs only

// Hint design — make hints that:
// - Give a memory cue or mnemonic without revealing the answer
// - Mention the category, context, or related concept
// - Give the first letter or part of the answer for hard questions
// - Reference where in the document this came from (e.g. "Think about the section on photosynthesis")

// SUBJECT-SPECIFIC INSTRUCTIONS:

// Mathematics: Write every formula in plain text (e.g. "E = mc squared"). Include worked example in the answer. Explain what the formula calculates and when to use it.

// Chemistry: Include atomic numbers, molecular formulas in plain text, reaction types, and balancing explanations. Describe what happens at a molecular level.

// Physics: Include units for every measurement. Explain the physical meaning behind equations. Connect formulas to real-world applications.

// Biology: Explain processes at cellular and organism level. For diagrams of cells/organs, describe each labeled part and its function.

// History: Always include the date, the people involved, the cause, what happened, and the consequence. Connect events to larger themes.

// Geography: Include location, climate, population context, and why the place or feature is significant.

// Literature: Identify themes, character motivations, literary devices, and the significance of key quotes or events in the plot.

// Economics: Explain cause-and-effect relationships between economic variables. Define terms with real examples.

// Languages: For vocabulary, include the word, its meaning, its part of speech, and an example sentence.

// QUALITY STANDARDS:
// - Every single piece of information in the document must become at least one flashcard
// - Minimum 15 flashcards, no maximum — cover everything
// - No two cards should overlap or repeat the same information
// - Each card must stand completely alone — a student should understand it with no other context
// - The difficulty should be varied: some cards test recall, some test understanding, some test application
// - Write as if you are the best teacher in the world explaining to a motivated student

// Return ONLY a valid JSON array — no preamble, no explanation, no markdown fences. Just the raw JSON array:
// [
//   {
//     "id": 1,
//     "term": "Clear, specific question written as a complete sentence",
//     "definition": "Complete, educational answer in plain text — no asterisks, no hashtags, no bullet symbols",
//     "hint": "A helpful memory cue or guiding hint without giving away the answer",
//     "category": "Specific subject area (e.g. Cell Biology, Algebra, World War II, Organic Chemistry)"
//   }
// ]`;

//     const response = await ai.models.generateContent({
//       model: "gemini-3-flash-preview",
//       contents: [
//         {
//           role: "user",
//           parts: [
//             {
//               inlineData: {
//                 mimeType,
//                 data: base64Data,
//               },
//             },
//             { text: prompt },
//           ],
//         },
//       ],
//     });

//     const rawText = response.text ?? "";

//     const cleaned = rawText
//       .replace(/```json\s*/gi, "")
//       .replace(/```\s*/g, "")
//       .trim();

//     let flashcards;
//     try {
//       flashcards = JSON.parse(cleaned);
//     } catch {
//       const match = cleaned.match(/\[[\s\S]*\]/);
//       if (match) {
//         flashcards = JSON.parse(match[0]);
//       } else {
//         throw new Error("Failed to parse flashcards from Gemini response");
//       }
//     }

//     return NextResponse.json({ flashcards });
//   } catch (error: any) {
//     console.error("Flashcard generation error:", error);
//     return NextResponse.json(
//       { error: error.message || "Failed to generate flashcards" },
//       { status: 500 },
//     );
//   }
// }


// app/api/generate-flashcards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const prompt = `You are ReviseForge AI — the world's most advanced flashcard generation engine. Your mission is to help students truly master the subject matter in this document, not just recognize surface details.

CRITICAL RULE — STRICTLY FORBIDDEN QUESTIONS:
NEVER create flashcards about any of the following — these are useless for studying:
- The title, name, or topic of the document or lecture
- The name, title, or role of the lecturer, author, professor, or instructor
- The course code, course name, university, school, or institution
- The date the lecture was given, the semester, or the academic year
- The page numbers, slide numbers, section headings, or document structure
- Any administrative or logistical metadata about the document itself
- Questions like "What is this lecture about?", "Who teaches this course?", "What is the course title?"

These questions test nothing. A student who has never read the document could guess them from the filename. They are banned.

WHAT YOU MUST FOCUS ON INSTEAD — the actual knowledge:
Every flashcard must test something a student needs to understand, remember, or be able to apply from the CONTENT of the document. Ask yourself before every card: "Would a student who studied hard need to know this for an exam?" If yes, create the card. If it is just metadata or administrative information, skip it entirely.

STEP 1 — DEEP CONTENT ANALYSIS:
Read the entire document and extract:
- Every key term, concept, definition, and technical vocabulary word
- Every theory, model, framework, or principle explained
- Every process, mechanism, sequence of steps, or workflow
- Every formula, equation, law, rule, or theorem
- Every cause-and-effect relationship or explanation of why something happens
- Every comparison or contrast between two or more ideas
- Every statistic, measurement, or quantitative fact that carries meaning
- Every historical event, person, or date that is discussed in context
- Every diagram, figure, chart, or table and what it demonstrates
- Every real-world example or case study used to illustrate a concept
- Every exception, special case, or nuance mentioned

STEP 2 — QUESTION DESIGN:
Write questions that require genuine understanding:
- "What is [concept] and why does it matter?" for definitions
- "How does [process] work?" for mechanisms and sequences
- "Why does [phenomenon] occur?" for causes and explanations
- "What is the formula for [calculation] and what does each part represent?" for math and science
- "What is the difference between [X] and [Y]?" for comparisons
- "What are the consequences/effects of [event or condition]?" for cause-and-effect
- "What happens when [condition]?" for applied understanding
- "How would you calculate/determine [result]?" for application
- "What does [diagram/figure/model] demonstrate?" for visual content
- "Under what conditions does [rule or law] apply?" for nuanced understanding
- "What are the stages/phases/steps of [process]?" for sequences

STEP 3 — ANSWER DESIGN:
Every answer must be a complete, standalone explanation:
- Never answer with just a word or short phrase — always explain fully
- For formulas: state the formula in plain text, define every variable, explain what it calculates, give a worked example if relevant
- For processes: explain each step and why it happens in that order
- For comparisons: clearly explain both sides and what makes them different
- For causes: explain the mechanism, not just label it
- For diagrams: describe what is shown and explain its significance to the subject
- Write in clean plain sentences only — no asterisks, no hashtags, no bullet points, no markdown symbols of any kind

STEP 4 — HINT DESIGN:
Every hint must be a genuine memory aid:
- Give a mnemonic, analogy, or memory cue
- Mention a related concept that connects to the answer
- Reference the context from the document (e.g. "Think about what happens during the second stage of...")
- Never repeat the question or give away the answer directly

SUBJECT-SPECIFIC DEPTH REQUIREMENTS:

Mathematics and Statistics: Every formula must appear in plain text with all variables defined. Include a worked numerical example in the answer. Explain when and why the formula is used, not just what it is.

Chemistry: Explain what happens at the molecular or atomic level. Include reaction types, conditions, and what the products mean. Molecular formulas in plain text only.

Physics: Include units for every quantity. Explain the physical intuition behind equations. Connect each concept to a real-world observable phenomenon.

Biology: Explain processes at the cellular level AND the organism level. For anatomical content, describe the structure AND its function AND what happens when it fails or is absent.

Population Studies, Demography, Sociology: Focus on the theories, models, rates, trends, determinants, and consequences — not who presented them. Cards should test understanding of concepts like fertility rates, mortality determinants, migration push-pull factors, demographic transition stages, and so on.

History and Politics: Always include the cause, the event, the key actors and their motivations, the immediate outcome, and the long-term significance. Never just list a name and a date.

Geography: Explain spatial patterns, why they exist, and their consequences. Include climate, economic, and human factors.

Economics: Explain the causal mechanism behind every relationship. Use concrete examples. Include both micro and macro implications where relevant.

Literature and Language: Focus on themes, symbolism, character development, narrative structure, and literary devices — not plot summaries.

QUALITY STANDARDS:
- Minimum 15 cards, no maximum — cover every piece of meaningful knowledge
- Every card must be something that could appear on an exam
- No two cards should test the same knowledge
- Difficulty must vary: recall, comprehension, application, and analysis
- A student should be able to study exclusively from these cards and pass their exam

Return ONLY a valid JSON array — no preamble, no explanation, no markdown fences, nothing before or after the array:
[
  {
    "id": 1,
    "term": "A specific, exam-worthy question about actual subject content",
    "definition": "A complete, educational explanation in plain sentences — no asterisks, no hashtags, no bullet symbols",
    "hint": "A memory cue, analogy, or contextual clue that helps recall without giving the answer",
    "category": "Specific subject area (e.g. Demographic Transition, Cell Biology, Organic Chemistry, Keynesian Economics)"
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const rawText = response.text ?? "";

    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let flashcards;
    try {
      flashcards = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        flashcards = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse flashcards from Gemini response");
      }
    }

    return NextResponse.json({ flashcards });
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}