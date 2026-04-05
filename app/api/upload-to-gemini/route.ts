import { NextRequest, NextResponse } from "next/server";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { getServerUser, unauthorizedError } from "@/lib/auth-server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

export const maxDuration = 120;

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  let tempPath = "";
  try {
    const user = await getServerUser();
    if (!user) return unauthorizedError();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Write to temp file
    const ext = file.name.split(".").pop() || "mp4";
    tempPath = join(tmpdir(), `reviseforge-${randomUUID()}.${ext}`);
    await writeFile(tempPath, buffer);

    const uploadResponse = await fileManager.uploadFile(tempPath, {
      mimeType: file.type || "video/mp4",
      displayName: file.name,
    });

    // Poll until processing is done
    let fileInfo = await fileManager.getFile(uploadResponse.file.name);
    let attempts = 0;
    while (fileInfo.state === "PROCESSING" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      fileInfo = await fileManager.getFile(uploadResponse.file.name);
      attempts++;
    }

    if (fileInfo.state === "FAILED") {
      return NextResponse.json({ error: "Gemini file processing failed." }, { status: 500 });
    }

    return NextResponse.json({ fileUri: fileInfo.uri, mimeType: fileInfo.mimeType });
  } catch (error: any) {
    console.error("Gemini file upload error:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  } finally {
    if (tempPath) {
      try { await unlink(tempPath); } catch (_) {}
    }
  }
}
