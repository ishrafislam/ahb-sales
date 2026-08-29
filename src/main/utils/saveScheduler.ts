/**
 * Coalesces the document's automatic saves. Every write to the data marks the
 * document dirty, and posting one invoice marks it several times over; a
 * trailing-edge timer turns that burst into a single file write, which matters
 * because writing re-encrypts the whole document synchronously.
 */

export type SaveScheduler = {
  /** Note a change. The write lands once the changes stop coming. */
  schedule(): void;
  /** Write now if one is pending — before closing, quitting or switching file. */
  flush(): void;
  cancel(): void;
  isPending(): boolean;
};

type Timers = {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
};

export function createSaveScheduler(
  write: () => void,
  delayMs = 250,
  timers: Timers = { setTimeout, clearTimeout }
): SaveScheduler {
  let handle: ReturnType<typeof setTimeout> | null = null;
  let writing = false;

  function run() {
    handle = null;
    if (writing) return;
    writing = true;
    try {
      write();
    } finally {
      writing = false;
    }
  }

  return {
    schedule() {
      // A change raised by the write itself would otherwise chase its own tail
      if (writing || handle !== null) return;
      handle = timers.setTimeout(run, delayMs);
    },
    flush() {
      if (handle === null) return;
      timers.clearTimeout(handle);
      run();
    },
    cancel() {
      if (handle === null) return;
      timers.clearTimeout(handle);
      handle = null;
    },
    isPending() {
      return handle !== null;
    },
  };
}
