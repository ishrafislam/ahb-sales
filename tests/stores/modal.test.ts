import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useModalStore } from "../../src/stores/modal";

describe("useModalStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have all modals closed by default", () => {
    const store = useModalStore();

    expect(store.showSalesHistory).toBe(false);
    expect(store.showPurchaseHistory).toBe(false);
    expect(store.showReportMoneyCustomer).toBe(false);
    expect(store.showReportMoneyDayWise).toBe(false);
    expect(store.showReportDailyPayment).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.showAbout).toBe(false);
  });

  it("should check if any modal is open", () => {
    const store = useModalStore();

    expect(store.isAnyModalOpen()).toBe(false);

    store.showSalesHistory = true;
    expect(store.isAnyModalOpen()).toBe(true);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });

  it("should close all modals", () => {
    const store = useModalStore();

    // Open multiple modals
    store.showSalesHistory = true;
    store.showSettings = true;

    store.closeAll();

    expect(store.showSalesHistory).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.isAnyModalOpen()).toBe(false);
  });

  describe("navigateTo", () => {
    it("should navigate to dashboard (close all)", () => {
      const store = useModalStore();
      store.showSalesHistory = true;
      store.showSettings = true;

      store.navigateTo("dashboard");

      expect(store.showSalesHistory).toBe(false);
      expect(store.showSettings).toBe(false);
      expect(store.isAnyModalOpen()).toBe(false);
    });

    it("should navigate to product sales history", () => {
      const store = useModalStore();

      store.navigateTo("product-sales-history");

      expect(store.showSalesHistory).toBe(true);
    });

    it("should navigate to product purchase history", () => {
      const store = useModalStore();

      store.navigateTo("product-purchase-history");

      expect(store.showPurchaseHistory).toBe(true);
    });

    it("should navigate to report money customer", () => {
      const store = useModalStore();

      store.navigateTo("report-money-customer");

      expect(store.showReportMoneyCustomer).toBe(true);
    });

    it("should navigate to report money daywise", () => {
      const store = useModalStore();

      store.navigateTo("report-money-daywise");

      expect(store.showReportMoneyDayWise).toBe(true);
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

      store.navigateTo("product-sales-history");

      expect(store.showSettings).toBe(false);
      expect(store.showSalesHistory).toBe(true);
    });
  });

  it("should support multiple sequential navigations", () => {
    const store = useModalStore();

    store.navigateTo("product-purchase-history");
    expect(store.showPurchaseHistory).toBe(true);

    store.navigateTo("product-sales-history");
    expect(store.showSalesHistory).toBe(true);
    expect(store.showPurchaseHistory).toBe(false);

    store.navigateTo("settings");
    expect(store.showSettings).toBe(true);
    expect(store.showSalesHistory).toBe(false);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });
});
