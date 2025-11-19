import * as crypto from "crypto";

// AES-256-GCM requires a 32-byte key (64 hex chars), 12-byte IV, and produces an auth tag.
// SECURITY: AHB_KEY_HEX must be provided via environment at build/runtime.
// In tests, we set this env var explicitly. In non-test envs, missing/invalid keys will throw.
function isValidHexKey(hex: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(hex);
}

let KEY: Buffer | null = null;
function getKey(): Buffer {
  if (KEY) return KEY;
  const keyHex = process.env.AHB_KEY_HEX ?? "";
  if (!isValidHexKey(keyHex)) {
    const isTest = process.env.NODE_ENV === "test" || process.env.VITEST;
    if (!isTest) {
      throw new Error(
        "AHB_KEY_HEX is required and must be a 64-hex-character string for AES-256-GCM."
      );
    }
  }
  KEY = Buffer.from(isValidHexKey(keyHex) ? keyHex : "", "hex");
  return KEY;
}

export function encryptJSON(obj: unknown): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.from(JSON.stringify(obj), "utf8");
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [MAGIC(4)] [VER(1)] [IV(12)] [TAG(16)] [ENC..]
  const header = Buffer.from([0x41, 0x48, 0x42, 0x53, 0x01]); // 'AHBS' + v1
  return Buffer.concat([header, iv, tag, enc]);
}

export function decryptJSON(buf: Buffer): unknown {
  if (buf.length < 4 + 1 + 12 + 16) throw new Error("Invalid file");
  const magic = buf.subarray(0, 4).toString("ascii");
  if (magic !== "AHBS") throw new Error("Not an AHBS file");
  const ver = buf[4];
  if (ver !== 0x01) throw new Error(`Unsupported version: ${ver}`);
  const iv = buf.subarray(5, 17);
  const tag = buf.subarray(17, 33);
  const enc = buf.subarray(33);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

export type AhbDocument = {
  schemaVersion: number;
  meta: { createdAt: string; updatedAt: string; branchName?: string };
  data: unknown; // Holds domain data; see data.ts for Phase 1 shape
};

export function createEmptyDocument(): AhbDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: { createdAt: now, updatedAt: now },
    data: { products: [], customers: [] },
  };
}
