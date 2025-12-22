/**
 * Memory usage utilities for monitoring and optimization
 */

export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    rss: Math.round(usage.rss / 1024 / 1024), // MB (Resident Set Size)
  };
}

export function logMemoryUsage(context: string): void {
  const mem = getMemoryUsage();
  console.log(
    `[Memory] ${context}: Heap ${mem.heapUsed}/${mem.heapTotal}MB, RSS ${mem.rss}MB`
  );
}

/**
 * Force garbage collection if available (needs --expose-gc flag)
 */
export function tryGarbageCollect(): boolean {
  if (global.gc) {
    global.gc();
    return true;
  }
  return false;
}

/**
 * Estimate object size in memory (rough approximation)
 */
export function estimateObjectSize(obj: unknown): number {
  try {
    const json = JSON.stringify(obj);
    return json.length * 2; // UTF-16 chars ~2 bytes each
  } catch {
    return 0;
  }
}
