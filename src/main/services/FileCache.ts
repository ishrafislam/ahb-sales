import type { AhbDocument } from "../crypto";
import type { AhbDataV1 } from "../data";

/**
 * Simple LRU-style cache to avoid re-parsing the same file repeatedly
 * Keeps only the most recently accessed document in memory
 */
export class FileCache {
  private cachedPath: string | null = null;
  private cachedDoc: AhbDocument | null = null;
  private maxSizeBytes = 50 * 1024 * 1024; // 50MB cache limit

  set(path: string, doc: AhbDocument): void {
    // Estimate size (rough approximation)
    const size = this.estimateSize(doc);

    if (size > this.maxSizeBytes) {
      // Document too large to cache, clear instead
      this.clear();
      return;
    }

    this.cachedPath = path;
    this.cachedDoc = doc;
  }

  get(path: string): AhbDocument | null {
    if (this.cachedPath === path && this.cachedDoc) {
      return this.cachedDoc;
    }
    return null;
  }

  clear(): void {
    this.cachedPath = null;
    this.cachedDoc = null;
  }

  invalidate(path: string): void {
    if (this.cachedPath === path) {
      this.clear();
    }
  }

  private estimateSize(doc: AhbDocument): number {
    try {
      return JSON.stringify(doc).length * 2; // UTF-16 chars ~2 bytes
    } catch {
      return Infinity; // Cannot serialize, don't cache
    }
  }
}
