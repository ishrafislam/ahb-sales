import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useModalStore } from "../../src/stores/modal";

describe("useModalStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have all modals closed by default", () => {
    const store = useModalStore();

    expect(store.showReportDailyPayment).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.showAbout).toBe(false);
  });

  it("should check if any modal is open", () => {
    const store = useModalStore();

    expect(store.isAnyModalOpen()).toBe(false);

    store.showReportDailyPayment = true;
    expect(store.isAnyModalOpen()).toBe(true);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });

  it("should close all modals", () => {
    const store = useModalStore();

    // Open multiple modals
    store.showReportDailyPayment = true;
    store.showSettings = true;

    store.closeAll();

    expect(store.showReportDailyPayment).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.isAnyModalOpen()).toBe(false);
  });

  describe("navigateTo", () => {
    it("should navigate to dashboard (close all)", () => {
      const store = useModalStore();
      store.showReportDailyPayment = true;
      store.showSettings = true;

      store.navigateTo("dashboard");

      expect(store.showReportDailyPayment).toBe(false);
      expect(store.showSettings).toBe(false);
      expect(store.isAnyModalOpen()).toBe(false);
    });

    it("should navigate to report daily payment", () => {
      const store = useModalStore();

      store.navigateTo("report-daily-payment");

      expect(store.showReportDailyPayment).toBe(true);
    });

    it("should navigate to settings", () => {
      const store = useModalStore();

      store.navigateTo("settings");

      expect(store.showSettings).toBe(true);
    });

    it("should close previous modal when navigating", () => {
      const store = useModalStore();
      store.navigateTo("settings");
      expect(store.showSettings).toBe(true);

      store.navigateTo("report-daily-payment");

      expect(store.showSettings).toBe(false);
      expect(store.showReportDailyPayment).toBe(true);
    });
  });

  it("should support multiple sequential navigations", () => {
    const store = useModalStore();

    store.navigateTo("report-daily-payment");
    expect(store.showReportDailyPayment).toBe(true);

    store.navigateTo("settings");
    expect(store.showSettings).toBe(true);
    expect(store.showReportDailyPayment).toBe(false);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });
});
