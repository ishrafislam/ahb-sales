import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useModalStore } from "../../src/stores/modal";

describe("useModalStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have all modals closed by default", () => {
    const store = useModalStore();

    expect(store.showCustomers).toBe(false);
    expect(store.showProducts).toBe(false);
    expect(store.showSalesHistory).toBe(false);
    expect(store.showPurchaseHistory).toBe(false);
    expect(store.showCustomerHistory).toBe(false);
    expect(store.showPurchaseEntry).toBe(false);
    expect(store.showReportMoneyCustomer).toBe(false);
    expect(store.showReportMoneyDayWise).toBe(false);
    expect(store.showReportDailyPayment).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.showAbout).toBe(false);
  });

  it("should check if any modal is open", () => {
    const store = useModalStore();

    expect(store.isAnyModalOpen()).toBe(false);

    store.showCustomers = true;
    expect(store.isAnyModalOpen()).toBe(true);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });

  it("should close all modals", () => {
    const store = useModalStore();

    // Open multiple modals
    store.showCustomers = true;
    store.showProducts = true;
    store.showSettings = true;

    store.closeAll();

    expect(store.showCustomers).toBe(false);
    expect(store.showProducts).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.isAnyModalOpen()).toBe(false);
  });

  describe("navigateTo", () => {
    it("should navigate to dashboard (close all)", () => {
      const store = useModalStore();
      store.showCustomers = true;
      store.showProducts = true;

      store.navigateTo("dashboard");

      expect(store.showCustomers).toBe(false);
      expect(store.showProducts).toBe(false);
      expect(store.isAnyModalOpen()).toBe(false);
    });

    it("should navigate to products", () => {
      const store = useModalStore();

      store.navigateTo("products");

      expect(store.showProducts).toBe(true);
      expect(store.showCustomers).toBe(false);
      expect(store.isAnyModalOpen()).toBe(true);
    });

    it("should navigate to customers", () => {
      const store = useModalStore();

      store.navigateTo("customers");

      expect(store.showCustomers).toBe(true);
      expect(store.showProducts).toBe(false);
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

    it("should navigate to customer history", () => {
      const store = useModalStore();

      store.navigateTo("customer-history");

      expect(store.showCustomerHistory).toBe(true);
    });

    it("should navigate to purchase entry", () => {
      const store = useModalStore();

      store.navigateTo("purchase-entry");

      expect(store.showPurchaseEntry).toBe(true);
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
      store.navigateTo("customers");
      expect(store.showCustomers).toBe(true);

      store.navigateTo("products");

      expect(store.showCustomers).toBe(false);
      expect(store.showProducts).toBe(true);
    });
  });

  it("should support multiple sequential navigations", () => {
    const store = useModalStore();

    store.navigateTo("customers");
    expect(store.showCustomers).toBe(true);

    store.navigateTo("products");
    expect(store.showProducts).toBe(true);
    expect(store.showCustomers).toBe(false);

    store.navigateTo("settings");
    expect(store.showSettings).toBe(true);
    expect(store.showProducts).toBe(false);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });
});
