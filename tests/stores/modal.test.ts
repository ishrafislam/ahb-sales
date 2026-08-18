import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useModalStore } from "../../src/stores/modal";

describe("useModalStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have all modals closed by default", () => {
    const store = useModalStore();

    expect(store.showSettings).toBe(false);
    expect(store.showAbout).toBe(false);
  });

  it("should check if any modal is open", () => {
    const store = useModalStore();

    expect(store.isAnyModalOpen()).toBe(false);

    store.showAbout = true;
    expect(store.isAnyModalOpen()).toBe(true);

    store.closeAll();
    expect(store.isAnyModalOpen()).toBe(false);
  });

  it("should close all modals", () => {
    const store = useModalStore();

    // Open multiple modals
    store.showAbout = true;
    store.showSettings = true;

    store.closeAll();

    expect(store.showAbout).toBe(false);
    expect(store.showSettings).toBe(false);
    expect(store.isAnyModalOpen()).toBe(false);
  });

  describe("navigateTo", () => {
    it("should navigate to dashboard (close all)", () => {
      const store = useModalStore();
      store.showAbout = true;
      store.showSettings = true;

      store.navigateTo("dashboard");

      expect(store.showAbout).toBe(false);
      expect(store.showSettings).toBe(false);
      expect(store.isAnyModalOpen()).toBe(false);
    });

    it("should navigate to settings", () => {
      const store = useModalStore();

      store.navigateTo("settings");

      expect(store.showSettings).toBe(true);
    });

    it("should close previous modal when navigating", () => {
      const store = useModalStore();
      store.showAbout = true;

      store.navigateTo("settings");

      expect(store.showAbout).toBe(false);
      expect(store.showSettings).toBe(true);
    });
  });

  it("should support multiple sequential navigations", () => {
    const store = useModalStore();

    store.navigateTo("settings");
    expect(store.showSettings).toBe(true);

    store.navigateTo("dashboard");
    expect(store.showSettings).toBe(false);
    expect(store.isAnyModalOpen()).toBe(false);
  });
});
