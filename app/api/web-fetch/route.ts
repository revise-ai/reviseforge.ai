import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function extractJSON(raw: string): any {
  let text = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch { /* continue */ }

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
  } catch { /* continue */ }

  const fixed = text
    .split("\n")
    .map((line) => line.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"))
    .join("\n");

  return JSON.parse(fixed);
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return unauthorizedError();

  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    const restricted = ["wa.me", "t.me", "web.whatsapp.com", "telegram.org", "facebook.com", "instagram.com"];
    if (restricted.some(domain => url.includes(domain))) {
      return NextResponse.json({ error: "Social media links are not supported yet." }, { status: 400 });
    }

    // High-speed fetch
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Target website timed out or refused connection.");
    const rawHtml = await response.text();

    // PERFORMANCE OPTIMIZATION: Strip heavy/useless tags before AI processing
    const cleanHtml = rawHtml
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
      .replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gim, "")
      .replace(/<path\b[^>]*>([\s\S]*?)<\/path>/gim, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .slice(0, 35000); // 35k clean chars is plenty for most articles

    const prompt = `You are ReviseForge AI — the world's most elite academic content extractor.
Your mission: Extract the core article/blog title and full pedagogic content from this HTML.

### EXTRACTION PROTOCOL:
1. **Accuracy**: Retain all technical, mathematical, and scientific data verbatim.
2. **Pedagogy**: Structure with ### Headers, **Bold**, and **LaTeX** ($...$) for every single formula/variable.
3. **Purity**: Strip all ads, links, sidebars, and nav elements.
4. **Formatting**: Use Markdown and valid JSON only.

### OUTPUT STRUCTURE (JSON):
{
  "title": "Elite Professional Title",
  "content": "Full pedagogical markdown content..."
}

HTML:
${cleanHtml}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Maximum speed
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const data = extractJSON(result.text ?? "");
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Web fetch error:", error);
    const msg = error.name === "TimeoutError" ? "The website took too long to respond." : "Failed to extract content accurately.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
