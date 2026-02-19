import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFileStore } from "../../src/stores/file";

describe("useFileStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("should have default state", () => {
    const store = useFileStore();

    expect(store.loaded).toBe(false);
    expect(store.filePath).toBeNull();
    expect(store.isDirty).toBe(false);
    expect(store.fileName).toBe("—");
  });

  describe("fileName computed property", () => {
    it("should return em dash when no file path", () => {
      const store = useFileStore();
      expect(store.fileName).toBe("—");
    });

    it("should extract filename from Windows path", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "C:\\Users\\Test\\Documents\\sales.ahbs", isDirty: false });
      expect(store.fileName).toBe("sales.ahbs");
    });

    it("should extract filename from Unix path", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "/home/user/documents/sales.ahbs", isDirty: false });
      expect(store.fileName).toBe("sales.ahbs");
    });

    it("should handle path with only filename", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "sales.ahbs", isDirty: false });
      expect(store.fileName).toBe("sales.ahbs");
    });

    it("should handle empty string path", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "", isDirty: false });
      expect(store.fileName).toBe("—");
    });

    it("should handle path ending with separator", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "/path/to/folder/", isDirty: false });
      // When path ends with separator, implementation returns the original path
      // because the last part is empty and it falls back to filePath.value
      expect(store.fileName).toBe("/path/to/folder/");
    });
  });

  describe("updateFileInfo", () => {
    it("should update file path and dirty state", () => {
      const store = useFileStore();

      store.updateFileInfo({ path: "/test/file.ahbs", isDirty: true });

      expect(store.filePath).toBe("/test/file.ahbs");
      expect(store.isDirty).toBe(true);
      expect(store.loaded).toBe(true);
    });

    it("should set loaded to false when path is null", () => {
      const store = useFileStore();
      store.updateFileInfo({ path: "/test/file.ahbs", isDirty: false });
      expect(store.loaded).toBe(true);

      store.updateFileInfo({ path: null, isDirty: false });

      expect(store.filePath).toBeNull();
      expect(store.loaded).toBe(false);
    });

    it("should handle path as null", () => {
      const store = useFileStore();

      store.updateFileInfo({ path: null, isDirty: false });

      expect(store.filePath).toBeNull();
      expect(store.isDirty).toBe(false);
      expect(store.loaded).toBe(false);
    });
  });

  describe("setLoaded", () => {
    it("should set loaded state directly", () => {
      const store = useFileStore();

      store.setLoaded(true);
      expect(store.loaded).toBe(true);

      store.setLoaded(false);
      expect(store.loaded).toBe(false);
    });

    it("should work independently of filePath", () => {
      const store = useFileStore();

      store.setLoaded(true);
      expect(store.loaded).toBe(true);
      expect(store.filePath).toBeNull();
    });
  });

  describe("integration scenarios", () => {
    it("should handle new file workflow", () => {
      const store = useFileStore();

      // User creates new file
      store.updateFileInfo({ path: "/new/file.ahbs", isDirty: true });
      expect(store.loaded).toBe(true);
      expect(store.isDirty).toBe(true);
      expect(store.fileName).toBe("file.ahbs");

      // User saves file
      store.updateFileInfo({ path: "/new/file.ahbs", isDirty: false });
      expect(store.isDirty).toBe(false);
    });

    it("should handle save as workflow", () => {
      const store = useFileStore();

      // Original file
      store.updateFileInfo({ path: "/old/file.ahbs", isDirty: false });
      expect(store.fileName).toBe("file.ahbs");

      // Save as new file
      store.updateFileInfo({ path: "/new/renamed.ahbs", isDirty: false });
      expect(store.fileName).toBe("renamed.ahbs");
      expect(store.isDirty).toBe(false);
    });

    it("should handle close file workflow", () => {
      const store = useFileStore();

      // File is open
      store.updateFileInfo({ path: "/test/file.ahbs", isDirty: true });
      expect(store.loaded).toBe(true);

      // Close file
      store.updateFileInfo({ path: null, isDirty: false });
      expect(store.loaded).toBe(false);
      expect(store.filePath).toBeNull();
      expect(store.isDirty).toBe(false);
    });
  });
});
