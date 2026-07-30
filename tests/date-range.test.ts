import { describe, it, expect } from "vitest";
import {
  formatDdMmYyyy,
  parseDdMmYyyy,
  shiftDate,
} from "../src/utils/dateRange";

const d = (text: string) => parseDdMmYyyy(text)!;
const shifted = (text: string, ...args: [Parameters<typeof shiftDate>[1], number]) =>
  formatDdMmYyyy(shiftDate(d(text), ...args));

describe("parseDdMmYyyy", () => {
  it("accepts a well-formed date", () => {
    const parsed = parseDdMmYyyy("30/07/2026")!;
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(30);
  });

  it("rejects dates the calendar disagrees with", () => {
    // Would silently roll into March if the check were missing
    expect(parseDdMmYyyy("31/02/2026")).toBeNull();
    expect(parseDdMmYyyy("29/02/2026")).toBeNull();
    expect(parseDdMmYyyy("00/07/2026")).toBeNull();
    expect(parseDdMmYyyy("30/13/2026")).toBeNull();
  });

  it("accepts a real leap day", () => {
    expect(parseDdMmYyyy("29/02/2024")).not.toBeNull();
  });

  it("rejects anything not in DD/MM/YYYY shape", () => {
    for (const bad of ["1/7/26", "2026-07-30", "hello", "", "  "]) {
      expect(parseDdMmYyyy(bad), bad).toBeNull();
    }
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseDdMmYyyy("  30/07/2026 ")).not.toBeNull();
  });
});

describe("formatDdMmYyyy", () => {
  it("pads and round-trips", () => {
    expect(formatDdMmYyyy(new Date(2026, 6, 5))).toBe("05/07/2026");
    expect(formatDdMmYyyy(d("30/07/2026"))).toBe("30/07/2026");
  });
});

describe("shiftDate", () => {
  it("steps days and weeks", () => {
    expect(shifted("30/07/2026", "day", 1)).toBe("31/07/2026");
    expect(shifted("30/07/2026", "day", -1)).toBe("29/07/2026");
    expect(shifted("30/07/2026", "week", 1)).toBe("06/08/2026");
    expect(shifted("30/07/2026", "week", -1)).toBe("23/07/2026");
  });

  it("crosses month and year boundaries", () => {
    expect(shifted("31/12/2026", "day", 1)).toBe("01/01/2027");
    expect(shifted("01/01/2026", "day", -1)).toBe("31/12/2025");
  });

  it("clamps instead of rolling over when stepping months", () => {
    expect(shifted("31/01/2026", "month", 1)).toBe("28/02/2026");
    expect(shifted("31/03/2026", "month", -1)).toBe("28/02/2026");
    expect(shifted("31/01/2024", "month", 1)).toBe("29/02/2024");
    expect(shifted("31/05/2026", "month", 1)).toBe("30/06/2026");
  });

  it("steps months across a year edge", () => {
    expect(shifted("15/01/2026", "month", -1)).toBe("15/12/2025");
    expect(shifted("15/12/2026", "month", 1)).toBe("15/01/2027");
    expect(shifted("15/06/2026", "month", -18)).toBe("15/12/2024");
  });

  it("steps years, clamping a leap day", () => {
    expect(shifted("30/07/2026", "year", 1)).toBe("30/07/2027");
    expect(shifted("30/07/2026", "year", -1)).toBe("30/07/2025");
    expect(shifted("29/02/2024", "year", 1)).toBe("28/02/2025");
  });

  it("leaves the original date untouched", () => {
    const original = d("30/07/2026");
    shiftDate(original, "month", 5);
    expect(formatDdMmYyyy(original)).toBe("30/07/2026");
  });
});
