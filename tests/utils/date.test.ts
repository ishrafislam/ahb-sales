import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nowIso,
  toYmd,
  todayYmd,
  formatDate,
  formatDateOnly,
  dateToIso,
  toDDMMYYYY,
} from "../../src/utils/date";

describe("Date utilities", () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock a specific date for consistent testing: 2024-11-18 10:30:00 UTC
    mockDate = new Date("2024-11-18T10:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("nowIso", () => {
    it("should return current date as ISO string", () => {
      const result = nowIso();
      expect(result).toBe("2024-11-18T10:30:00.000Z");
    });

    it("should return valid ISO format", () => {
      const result = nowIso();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe("toYmd", () => {
    it("should format date to YYYY-MM-DD", () => {
      const date = new Date("2024-11-18");
      expect(toYmd(date)).toBe("2024-11-18");
    });

    it("should handle single-digit month and day", () => {
      const date = new Date("2024-01-05");
      expect(toYmd(date)).toBe("2024-01-05");
    });

    it("should handle year boundaries", () => {
      const startOfYear = new Date("2024-01-01");
      expect(toYmd(startOfYear)).toBe("2024-01-01");

      const endOfYear = new Date("2024-12-31");
      expect(toYmd(endOfYear)).toBe("2024-12-31");
    });

    it("should handle leap year", () => {
      const leapDay = new Date("2024-02-29");
      expect(toYmd(leapDay)).toBe("2024-02-29");
    });

    it("should pad month and day with zeros", () => {
      const date = new Date("2024-03-09");
      expect(toYmd(date)).toBe("2024-03-09");
    });
  });

  describe("todayYmd", () => {
    it("should return today in YYYY-MM-DD format", () => {
      // Using mocked date 2024-11-18
      expect(todayYmd()).toBe("2024-11-18");
    });

    it("should return consistent value across multiple calls", () => {
      const first = todayYmd();
      const second = todayYmd();
      expect(first).toBe(second);
    });
  });

  describe("formatDate", () => {
    it("should format ISO string to DD-MM-YYYY", () => {
      const iso = "2024-11-18T10:30:00.000Z";
      expect(formatDate(iso)).toBe("18-11-2024");
    });

    it("should handle date-only ISO string", () => {
      const iso = "2024-03-15T00:00:00.000Z";
      expect(formatDate(iso)).toBe("15-03-2024");
    });

    it("should handle single-digit day and month", () => {
      const iso = "2024-01-05T00:00:00.000Z";
      expect(formatDate(iso)).toBe("05-01-2024");
    });

    it("should handle year boundary", () => {
      const iso = "2025-01-01T00:00:00.000Z";
      expect(formatDate(iso)).toBe("01-01-2025");
    });

    it("should handle invalid date strings gracefully", () => {
      // The implementation tries to parse but returns NaN-NaN-NaN for invalid dates
      const invalid = "not-a-date";
      const result = formatDate(invalid);
      // Should either return original or formatted NaN
      expect(result === "not-a-date" || result === "NaN-NaN-NaN").toBe(true);
    });

    it("should handle empty string gracefully", () => {
      const result = formatDate("");
      // Empty string creates an invalid date
      expect(result === "" || result === "NaN-NaN-NaN").toBe(true);
    });
  });

  describe("formatDateOnly", () => {
    it("should format Date object to DD-MM-YYYY", () => {
      const date = new Date("2024-11-18");
      expect(formatDateOnly(date)).toBe("18-11-2024");
    });

    it("should pad single digits", () => {
      const date = new Date("2024-01-05");
      expect(formatDateOnly(date)).toBe("05-01-2024");
    });

    it("should handle different months", () => {
      const feb = new Date("2024-02-15");
      expect(formatDateOnly(feb)).toBe("15-02-2024");

      const dec = new Date("2024-12-25");
      expect(formatDateOnly(dec)).toBe("25-12-2024");
    });
  });

  describe("dateToIso", () => {
    it("should convert Date to ISO string", () => {
      const date = new Date("2024-11-18T10:30:00.000Z");
      expect(dateToIso(date)).toBe("2024-11-18T10:30:00.000Z");
    });

    it("should handle different dates", () => {
      const date = new Date("2024-01-15T08:00:00.000Z");
      expect(dateToIso(date)).toBe("2024-01-15T08:00:00.000Z");
    });
  });

  describe("toDDMMYYYY", () => {
    it("should convert ISO string to DD-MM-YYYY", () => {
      const iso = "2024-11-18T10:30:00.000Z";
      expect(toDDMMYYYY(iso)).toBe("18-11-2024");
    });

    it("should convert YYYY-MM-DD string to DD-MM-YYYY", () => {
      const ymd = "2024-11-18";
      expect(toDDMMYYYY(ymd)).toBe("18-11-2024");
    });

    it("should handle YYYY-MM-DD with single digits", () => {
      const ymd = "2024-01-05";
      expect(toDDMMYYYY(ymd)).toBe("05-01-2024");
    });

    it("should handle ISO date without time", () => {
      const isoShort = "2024-03-15";
      expect(toDDMMYYYY(isoShort)).toBe("15-03-2024");
    });

    it("should handle different date formats consistently", () => {
      const isoFull = "2024-12-25T14:30:00.000Z";
      const isoShort = "2024-12-25";

      expect(toDDMMYYYY(isoFull)).toBe("25-12-2024");
      expect(toDDMMYYYY(isoShort)).toBe("25-12-2024");
    });
  });

  describe("integration and edge cases", () => {
    it("should handle round-trip conversion", () => {
      const original = new Date("2024-06-15");
      const ymd = toYmd(original);
      const iso = dateToIso(original);
      const formatted = formatDateOnly(original);

      expect(ymd).toBe("2024-06-15");
      expect(formatted).toBe("15-06-2024");
      expect(iso).toContain("2024-06-15");
    });

    it("should work with todays date across all functions", () => {
      const today = todayYmd();
      const now = nowIso();
      const formatted = toDDMMYYYY(today);

      // All should be consistent
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(now).toContain(today);
      expect(formatted).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    });

    it("should handle date comparisons", () => {
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-12-31");

      const ymd1 = toYmd(date1);
      const ymd2 = toYmd(date2);

      expect(ymd1 < ymd2).toBe(true);
      expect(ymd1).toBe("2024-01-01");
      expect(ymd2).toBe("2024-12-31");
    });
  });
});
