import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!genAI) return text;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Translate the following text to ${targetLanguage}. Return ONLY the translated text, no explanations: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || text;
  } catch (error) {
    console.error("Gemini translation error:", error);
    return text;
  }
}
