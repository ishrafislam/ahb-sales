import { describe, it, expect, beforeEach } from "vitest";
import { currentLang } from "../../src/i18n";
import {
  fmtDate,
  fmtMoney,
  fmtQuantity,
  localizeDigits,
  parseInteger,
  parseNumber,
  toBengaliDigits,
  toLatinDigits,
} from "../../src/utils/numerals";

describe("numerals", () => {
  beforeEach(() => {
    currentLang.value = "en";
  });

  it("transliterates both ways", () => {
    expect(toBengaliDigits("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
    expect(toLatinDigits("১২৩৪৫৬৭৮৯০")).toBe("1234567890");
    // Anything that is not a digit is left where it is
    expect(toBengaliDigits("30/07/2026")).toBe("৩০/০৭/২০২৬");
    expect(toLatinDigits("চাল ৫ kg")).toBe("চাল 5 kg");
  });

  it("localizes only in Bengali", () => {
    expect(localizeDigits(1000)).toBe("1000");
    currentLang.value = "bn";
    expect(localizeDigits(1000)).toBe("১০০০");
  });

  it("groups money by thousands, not by lakh", () => {
    expect(fmtMoney(101013)).toBe("101,013.00");
    currentLang.value = "bn";
    // bn-BD would render this "১,০১,০১৩.০০"; the shop's ledgers do not
    expect(fmtMoney(101013)).toBe("১০১,০১৩.০০");
    expect(fmtMoney(11650)).toBe("১১,৬৫০.০০");
  });

  it("leaves a quantity without forced decimals", () => {
    expect(fmtQuantity(6)).toBe("6");
    expect(fmtQuantity(2.5)).toBe("2.5");
    currentLang.value = "bn";
    expect(fmtQuantity(2.5)).toBe("২.৫");
  });

  it("keeps the day-first date layout", () => {
    expect(fmtDate("2026-07-30T10:00:00.000Z")).toBe("30/07/2026");
    currentLang.value = "bn";
    expect(fmtDate("2026-07-30T10:00:00.000Z")).toBe("৩০/০৭/২০২৬");
    // Nothing to parse means nothing to show
    expect(fmtDate("not a date")).toBe("not a date");
  });

  it("reads back what the user typed, in either script", () => {
    expect(parseNumber("১২.৫")).toBe(12.5);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber(" ৭ ")).toBe(7);
    expect(Number.isNaN(parseNumber("চাল"))).toBe(true);
    expect(parseInteger("১০০০")).toBe(1000);
    expect(parseInteger("007")).toBe(7);
  });
});
