import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAppStore } from "../../src/stores/app";

describe("useAppStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have default state", () => {
    const store = useAppStore();

    expect(store.lang).toBe("bn");
    expect(store.showUpdateToast).toBe(false);
    expect(store.updateToastText).toBe("");
    expect(store.canRestartForUpdate).toBe(false);
  });

  describe("setLanguage", () => {
    it("should set language to English", () => {
      const store = useAppStore();

      store.setLanguage("en");

      expect(store.lang).toBe("en");
    });

    it("should set language to Bengali", () => {
      const store = useAppStore();
      store.setLanguage("en");

      store.setLanguage("bn");

      expect(store.lang).toBe("bn");
    });

    it("should switch languages multiple times", () => {
      const store = useAppStore();

      store.setLanguage("en");
      expect(store.lang).toBe("en");

      store.setLanguage("bn");
      expect(store.lang).toBe("bn");

      store.setLanguage("en");
      expect(store.lang).toBe("en");
    });
  });

  describe("update toast functionality", () => {
    it("should show update message", () => {
      const store = useAppStore();

      store.showUpdateMessage("Update available");

      expect(store.showUpdateToast).toBe(true);
      expect(store.updateToastText).toBe("Update available");
      expect(store.canRestartForUpdate).toBe(false);
    });

    it("should show update message with restart option", () => {
      const store = useAppStore();

      store.showUpdateMessage("Update downloaded", true);

      expect(store.showUpdateToast).toBe(true);
      expect(store.updateToastText).toBe("Update downloaded");
      expect(store.canRestartForUpdate).toBe(true);
    });

    it("should hide update toast", () => {
      const store = useAppStore();
      store.showUpdateMessage("Update available");
      expect(store.showUpdateToast).toBe(true);

      store.hideUpdateToast();

      expect(store.showUpdateToast).toBe(false);
    });

    it("should handle sequential update messages", () => {
      const store = useAppStore();

      // First message: checking
      store.showUpdateMessage("Checking for updates...");
      expect(store.updateToastText).toBe("Checking for updates...");
      expect(store.canRestartForUpdate).toBe(false);

      // Second message: update available
      store.showUpdateMessage("Update available", false);
      expect(store.updateToastText).toBe("Update available");
      expect(store.canRestartForUpdate).toBe(false);

      // Third message: downloaded, can restart
      store.showUpdateMessage("Update downloaded. Restart to apply.", true);
      expect(store.updateToastText).toBe("Update downloaded. Restart to apply.");
      expect(store.canRestartForUpdate).toBe(true);

      // Hide toast
      store.hideUpdateToast();
      expect(store.showUpdateToast).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should handle language switch with toast", () => {
      const store = useAppStore();

      // User switches language
      store.setLanguage("en");
      expect(store.lang).toBe("en");

      // App shows toast
      store.showUpdateMessage("Language changed to English");
      expect(store.showUpdateToast).toBe(true);

      // User dismisses toast
      store.hideUpdateToast();
      expect(store.showUpdateToast).toBe(false);
    });

    it("should handle update flow", () => {
      const store = useAppStore();

      // Initial state
      expect(store.showUpdateToast).toBe(false);

      // Checking for updates
      store.showUpdateMessage("Checking for updates...");
      expect(store.showUpdateToast).toBe(true);
      expect(store.canRestartForUpdate).toBe(false);

      // Update available, downloading
      store.showUpdateMessage("Downloading update...");
      expect(store.canRestartForUpdate).toBe(false);

      // Downloaded, can restart
      store.showUpdateMessage("Update ready. Click to restart.", true);
      expect(store.canRestartForUpdate).toBe(true);

      // User clicks restart (handled by IPC), toast hides
      store.hideUpdateToast();
      expect(store.showUpdateToast).toBe(false);
    });
  });
});
