// ── IndexedDB Helper for Large Media Persistence (ReviseForge) ────────────────
const DB_NAME = "ReviseForgeCache";
const STORE_NAME = "workstation_media";

export interface MediaRecord {
  base64: string;
  mimeType: string;
  fileName: string;
  thumbnail?: string;
  geminiUri?: string;
  timestamp?: number;
}

export async function saveMediaToDB(data: MediaRecord) {
  return new Promise<void>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return resolve();
    
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ ...data, timestamp: Date.now() }, "current_file");
      transaction.oncomplete = () => resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getMediaFromDB(): Promise<MediaRecord | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);

    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readonly");
      const getReq = transaction.objectStore(STORE_NAME).get("current_file");
      getReq.onsuccess = () => resolve(getReq.result || null);
    };
    request.onerror = () => resolve(null);
  });
}
