// lib/tierLimits.ts
// ─────────────────────────────────────────────────────────────
// File size limits and allowed types per plan tier.
// Free tier: limited sizes + 14-day message expiry
// Pro tier:  larger limits + messages never expire
// ─────────────────────────────────────────────────────────────

export type PlanTier = "free" | "pro";

export interface TierLimits {
  maxImageBytes: number;      // per upload
  maxDocumentBytes: number;   // pdf, docx, txt
  maxAudioBytes: number;      // voice recordings
  maxVideoBytes: number;      // video clips
  messageExpiryDays: number | null; // null = never
  label: {
    image: string;
    document: string;
    audio: string;
    video: string;
  };
}

export const TIER_LIMITS: Record<PlanTier, TierLimits> = {
  free: {
    maxImageBytes:    2 * 1024 * 1024,   // 2 MB
    maxDocumentBytes: 5 * 1024 * 1024,   // 5 MB
    maxAudioBytes:    5 * 1024 * 1024,   // 5 MB
    maxVideoBytes:    10 * 1024 * 1024,  // 10 MB
    messageExpiryDays: 14,
    label: {
      image:    "2 MB",
      document: "5 MB",
      audio:    "5 MB",
      video:    "10 MB",
    },
  },
  pro: {
    maxImageBytes:    20 * 1024 * 1024,  // 20 MB
    maxDocumentBytes: 50 * 1024 * 1024,  // 50 MB
    maxAudioBytes:    25 * 1024 * 1024,  // 25 MB
    maxVideoBytes:   100 * 1024 * 1024,  // 100 MB
    messageExpiryDays: null,             // never expires
    label: {
      image:    "20 MB",
      document: "50 MB",
      audio:    "25 MB",
      video:    "100 MB",
    },
  },
};

export type MessageFileType = "image" | "document" | "audio" | "video";

export function getFileType(mimeType: string): MessageFileType | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/plain"
  )
    return "document";
  return null;
}

export function getStorageBucket(fileType: MessageFileType): string {
  const buckets: Record<MessageFileType, string> = {
    image:    "channel-images",
    document: "channel-files",
    audio:    "channel-audio",
    video:    "channel-videos",
  };
  return buckets[fileType];
}

export function validateFileSize(
  file: File,
  plan: PlanTier
): { valid: boolean; error?: string } {
  const limits = TIER_LIMITS[plan];
  const fileType = getFileType(file.type);

  if (!fileType) {
    return { valid: false, error: "File type not supported." };
  }

  const limitMap: Record<MessageFileType, number> = {
    image:    limits.maxImageBytes,
    document: limits.maxDocumentBytes,
    audio:    limits.maxAudioBytes,
    video:    limits.maxVideoBytes,
  };

  const labelMap: Record<MessageFileType, string> = limits.label as unknown as Record<MessageFileType, string>;

  if (file.size > limitMap[fileType]) {
    const planLabel = plan === "free" ? "Free" : "Pro";
    return {
      valid: false,
      error: `${planLabel} plan limit: ${fileType}s up to ${labelMap[fileType]}. ${
        plan === "free" ? "Upgrade to Pro for larger files." : ""
      }`,
    };
  }

  return { valid: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}