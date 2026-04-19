import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

const CONVERSATION_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

function validateId(conversationId: string): void {
  if (!CONVERSATION_ID_RE.test(conversationId)) {
    throw new Error(`Invalid conversationId: ${conversationId}`);
  }
}

function resolveDir(): string {
  const dir =
    process.env["AUDIO_STORAGE_DIR"] ??
    path.join(__dirname, "../../../data/call-audio");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class AudioNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Audio not found for conversation ${conversationId}`);
    this.name = "AudioNotFoundError";
  }
}

export async function saveAudio(
  conversationId: string,
  audioBytes: Uint8Array
): Promise<{ path: string; bytes: number }> {
  validateId(conversationId);
  const dir = resolveDir();
  const filePath = path.join(dir, `${conversationId}.mp3`);
  fs.writeFileSync(filePath, audioBytes);
  // Return path relative to repo root for portability
  const repoRoot = path.join(__dirname, "../../..");
  const relativePath = path.relative(repoRoot, filePath);
  return { path: relativePath, bytes: audioBytes.length };
}

export function readAudioStream(conversationId: string): Readable {
  validateId(conversationId);
  const dir = resolveDir();
  const filePath = path.join(dir, `${conversationId}.mp3`);
  if (!fs.existsSync(filePath)) {
    throw new AudioNotFoundError(conversationId);
  }
  return fs.createReadStream(filePath);
}
