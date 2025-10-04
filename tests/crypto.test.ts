import { describe, it, expect, beforeAll } from "vitest";

// Ensure a deterministic key for tests
beforeAll(() => {
  process.env.AHB_KEY_HEX =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

// Import after setting env so module picks it up
import {
  createEmptyDocument,
  encryptJSON,
  decryptJSON,
  type AhbDocument,
} from "../src/main/crypto";

describe("crypto (AES-256-GCM container)", () => {
  it("encrypts and decrypts a document roundtrip", () => {
    const doc: AhbDocument = createEmptyDocument();
    doc.meta.branchName = "Test Branch";
    (doc.data as Record<string, unknown>).hello = "world";

    const enc = encryptJSON(doc);
    expect(enc.byteLength).toBeGreaterThan(4 + 1 + 12 + 16);

    const dec = decryptJSON(enc) as AhbDocument;
    expect(dec.schemaVersion).toBe(1);
    expect(dec.meta.branchName).toBe("Test Branch");
    expect((dec.data as Record<string, unknown>).hello).toBe("world");
  });

  it("throws on invalid magic header", () => {
    const bad = Buffer.from("BAD!\x01" + "x".repeat(12 + 16), "binary");
    expect(() => decryptJSON(bad)).toThrow();
  });
});
