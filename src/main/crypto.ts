import crypto from "node:crypto";

// NOTE: For v1, the key is embedded at build time as per requirements.
// In production, consider secure key management.
// AES-256-GCM requires 32-byte key, 12-byte IV, and produces auth tag.

const KEY_HEX =
  process.env.AHB_KEY_HEX ||
  "0000000000000000000000000000000000000000000000000000000000000000";
const KEY = Buffer.from(KEY_HEX, "hex");

export function encryptJSON(obj: unknown): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
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
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

export type AhbDocument = {
  schemaVersion: number;
  meta: { createdAt: string; updatedAt: string; branchName?: string };
  data: unknown; // Placeholder for future schema
};

export function createEmptyDocument(): AhbDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: { createdAt: now, updatedAt: now },
    data: {},
  };
}
