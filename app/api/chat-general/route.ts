// // File path: app/api/chat-general/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// export async function POST(req: NextRequest) {
//   try {
//     const { question, history } = await req.json();

//     if (!question) {
//       return NextResponse.json(
//         { error: "No question provided" },
//         { status: 400 },
//       );
//     }

//     // Build conversation context from the last few messages
//     const historyContext =
//       history && history.length > 0
//         ? `\n\nPrevious conversation:\n${history
//             .slice(-6)
//             .map(
//               (m: { role: string; message: string }) =>
//                 `${m.role === "user" ? "Student" : "AI"}: ${m.message}`,
//             )
//             .join("\n")}\n`
//         : "";

//     const prompt = `You are a knowledgeable, friendly AI study assistant. A student has typed a question directly into the study platform.
// ${historyContext}
// Student's question: "${question}"

// Instructions:
// - Answer the student's question thoroughly and helpfully.
// - If the question is about a subject or topic, explain it clearly with examples where relevant.
// - If the question asks you to quiz them, generate a few relevant questions.
// - If the question asks you to summarise a topic, provide a clear, structured summary.
// - If the student references something from the conversation above, use that context naturally.
// - If the question is about a YouTube video or file they mentioned uploading, acknowledge it and help accordingly.
// - Write in clear, plain prose. No asterisks, no hashtags, no bullet symbols.
// - Be concise for simple questions (3–5 sentences) and thorough for complex ones.
// - Be warm and encouraging — you are a study assistant helping someone learn.`;

//     const response = await ai.models.generateContent({
//       model: "gemini-3-flash-preview",
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: prompt }],
//         },
//       ],
//     });

//     const answer = response.text ?? "";

//     if (!answer) {
//       return NextResponse.json(
//         { error: "No answer was generated. Please try again." },
//         { status: 500 },
//       );
//     }

//     return NextResponse.json({ answer });
//   } catch (error: any) {
//     console.error("Chat general error:", error);

//     if (error?.message?.includes("429") || error?.message?.includes("quota")) {
//       return NextResponse.json(
//         { error: "API quota exceeded. Please wait a moment and try again." },
//         { status: 429 },
//       );
//     }

//     return NextResponse.json(
//       { error: error.message || "Failed to answer question" },
//       { status: 500 },
//     );
//   }
// }

// File path: app/api/chat-general/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { ChatSchema, validationError, serverError } from "@/lib/validation";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = ChatSchema.safeParse(body);
  if (!result.success) return validationError(result.error);
  const { question, history, channelContext } = result.data;

  const blocked = await applyRateLimit(req, RATE_LIMITS.chat, "chat-general");
  if (blocked) return blocked;

  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {

    if (!question) {
      return NextResponse.json(
        { error: "No question provided" },
        { status: 400 },
      );
    }

    // Build conversation context from the last few messages
    const historyContext =
      history && history.length > 0
        ? `\n\nPrevious conversation:\n${history
            .slice(-6)
            .map(
              (m: { role: string; message: string }) =>
                `${m.role === "user" ? "Student" : "AI"}: ${m.message}`,
            )
            .join("\n")}\n`
        : "";

    // If called from a channel with a quoted message, include that context
    const channelNote = channelContext
      ? `\n\nThis question was asked inside a study group channel. ${channelContext}`
      : "";

    const prompt = `You are ReviseForge AI, a friendly, helpful, and highly intelligent academic study assistant.

${historyContext}${channelNote}

### SPECIAL DIRECTIVES:
- **Scope**: You are an elite tutor with boundless knowledge.
- **Mind Map & Visualization Requests**:
  - If the question starts with [Requested Mind Map format]: Your output MUST be a \`\`\`mermaid\nmindmap\n...\`\`\` block.
  - If there is relevant session history, use it. Otherwise, create a high-level academic mind map from your base training.

Current Question: "${question}"

Instructions:
1. Provide a direct, concise, and helpful answer.
2. For basic greetings like "hi" or "hello", respond warmly in just 1-2 lines.
3. If the user asks a complex academic question, answer clearly using standard markdown.
   - For MATH questions: Provide structured, step-by-step working. Use $\LaTeX$ with "$" or "$$" tags.
   - For Diagrams: Use \`\`\`mermaid\`\`\` and ALLWAYS include \`%% title: 3-4 words\` on the first line.
4. Keep your responses simple and direct.

Sign off as ReviseForge AI.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const answer = response.text ?? "";

    if (!answer) {
      return NextResponse.json(
        { error: "No answer was generated. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ answer });
  } catch (error: any) {
    console.error(`Chat general error [User: ${user.id}]:`, error);

    if (error?.message?.includes("429") || error?.message?.includes("quota")) {
      return NextResponse.json(
        { error: "AI quota exceeded. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    return serverError();
  }
}