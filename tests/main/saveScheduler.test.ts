import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSaveScheduler } from "../../src/main/utils/saveScheduler";

describe("createSaveScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes once for a burst of changes", () => {
    const write = vi.fn();
    const saves = createSaveScheduler(write, 250);

    // Posting one invoice marks the document dirty several times over
    saves.schedule();
    saves.schedule();
    saves.schedule();
    expect(write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(write).toHaveBeenCalledTimes(1);
    expect(saves.isPending()).toBe(false);
  });

  it("writes again for a change that comes after", () => {
    const write = vi.fn();
    const saves = createSaveScheduler(write, 250);

    saves.schedule();
    vi.advanceTimersByTime(250);
    saves.schedule();
    vi.advanceTimersByTime(250);

    expect(write).toHaveBeenCalledTimes(2);
  });

  it("flushes a pending write straight away", () => {
    const write = vi.fn();
    const saves = createSaveScheduler(write, 250);

    saves.schedule();
    saves.flush();

    expect(write).toHaveBeenCalledTimes(1);
    expect(saves.isPending()).toBe(false);

    // The timer must not fire a second write behind it
    vi.advanceTimersByTime(250);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("flushing with nothing pending writes nothing", () => {
    const write = vi.fn();
    const saves = createSaveScheduler(write, 250);

    saves.flush();

    expect(write).not.toHaveBeenCalled();
  });

  it("cancel drops the pending write", () => {
    const write = vi.fn();
    const saves = createSaveScheduler(write, 250);

    saves.schedule();
    saves.cancel();
    vi.advanceTimersByTime(250);

    expect(write).not.toHaveBeenCalled();
    expect(saves.isPending()).toBe(false);
  });

  it("does not chase a change raised by the write itself", () => {
    const write = vi.fn(() => {
      saves.schedule();
    });
    const saves = createSaveScheduler(write, 250);

    saves.schedule();
    vi.advanceTimersByTime(250);
    vi.advanceTimersByTime(1000);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it("keeps writing after one throws", () => {
    const write = vi.fn(() => {
      throw new Error("read-only volume");
    });
    const saves = createSaveScheduler(write, 250);

    saves.schedule();
    expect(() => vi.advanceTimersByTime(250)).toThrow("read-only volume");

    // The failure must not leave the scheduler stuck mid-write
    saves.schedule();
    expect(saves.isPending()).toBe(true);
  });
});
