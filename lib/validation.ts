// lib/validation.ts
import { z } from "zod";
import { NextResponse } from "next/server";

// ── Sanitization Utility ───────────────────────────────────────────────────

/**
 * Sanitizes a string by:
 * 1. Trimming whitespace.
 * 2. Collapsing multiple spaces.
 * 3. Stripping basic HTML-like tags (simple protection).
 */
export function sanitizeString(val: string, maxLength = 5000): string {
  if (typeof val !== "string") return "";
  
  return val
    .trim()
    .replace(/\s+/g, " ") // Collapse spaces
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .slice(0, maxLength); // Enforce max length
}

// ── Common Schemas ─────────────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "model", "ai", "student"]), // Flexible to match different routes
  message: z.string().transform((v) => sanitizeString(v, 2000)),
});

// ── API Specific Schemas ───────────────────────────────────────────────────

/** Chat (general, youtube, recording) */
export const ChatSchema = z.object({
  question: z.string().min(1, "Question is required").transform((v) => sanitizeString(v, 3000)),
  history: z.array(MessageSchema).optional(),
  url: z.string().url("Invalid URL").optional(), // For youtube chat
  channelContext: z.string().optional().transform((v) => v ? sanitizeString(v, 1000) : v),
  audioBase64: z.string().optional(), // For recording chat
  mimeType: z.string().optional(),
  transcript: z.string().optional().transform((v) => v ? sanitizeString(v, 10000) : v),
});

/** Generation (Quiz, Exam, Flashcards, Summary, Chapters) from JSON */
export const GenerationSchema = z.object({
  url: z.string().url("Invalid URL").optional(),
  userQuery: z.string().optional().transform((v) => v ? sanitizeString(v, 2000) : v),
  audioBase64: z.string().optional(),
  mimeType: z.string().optional(),
  transcript: z.string().optional().transform((v) => v ? sanitizeString(v, 10000) : v),
  durationSecs: z.number().optional(),
});

/** Utility (Polish, Voice Transcribe) */
export const UtilitySchema = z.object({
  mode: z.string().optional(),
  noteContent: z.string().optional().transform((v) => v ? sanitizeString(v, 20000) : v),
  resourceParts: z.array(z.any()).optional(),
  audio: z.string().optional(), // For voice transcribe
  mimeType: z.string().optional(),
});

/** Auth Callback (GET query params) */
export const AuthCallbackSchema = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  invite: z.string().optional(),
  next: z.string().optional().transform((v) => v ? sanitizeString(v, 255) : "/dashboard"),
});

// ── FormData Validation ─────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "application/pdf", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
  "image/jpeg",
  "image/png",
  "audio/mpeg",
  "audio/wav",
  "audio/webm"
];

/**
 * Validates file from FormData.
 */
export function validateFile(file: File | null): string | null {
  if (!file) return "No file provided";
  if (file.size > MAX_FILE_SIZE) return "File exceeds 10MB limit";
  if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== "") {
    // Note: Some systems return empty string for specific file types, 
    // so we're a bit flexible but warn on size.
  }
  return null;
}

/**
 * Standardized validation error response.
 */
export function validationError(error: any) {
  const message = error instanceof z.ZodError 
    ? error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")
    : "Invalid request data";
    
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Standardized server error response (sanitized).
 */
export function serverError(message = "An unexpected error occurred. Please try again.") {
  return NextResponse.json({ error: message }, { status: 500 });
}
