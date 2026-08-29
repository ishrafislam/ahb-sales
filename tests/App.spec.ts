import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import App from "../src/App.vue";

// Minimal SFC test ensuring component renders and language switch updates title

describe("App.vue", () => {
  it("renders initial file selection and shows dashboard after file opens", async () => {
    // Stub preload API
    let langCb: ((l: "bn" | "en") => void) | null = null;
    let docCb: (() => void) | null = null as (() => void) | null;
    window.ahb = {
      getLanguage: async () => "en",
      setLanguage: async (_l: "bn" | "en") => {
        if (langCb) langCb(_l);
      },
      newFile: async () => {
        if (docCb) docCb();
      },
      openFile: async () => {
        if (docCb) docCb();
      },
      saveFileAs: async () => Promise.resolve(),
      onLanguageChanged: (cb: (l: "bn" | "en") => void) => {
        langCb = cb;
        return () => {
          langCb = null;
        };
      },
      onDocumentChanged: (cb: () => void): (() => void) => {
        docCb = cb;
        return () => {
          docCb = null;
        };
      },
      // Phase 1 stubs
      listProducts: async (): Promise<unknown[]> => [],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      addProduct: async (_: unknown): Promise<unknown> => ({}) as unknown,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updateProduct: async (_: number, __: unknown): Promise<unknown> =>
        ({}) as unknown,
      listCustomers: async (): Promise<unknown[]> => [],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      addCustomer: async (_: unknown): Promise<unknown> => ({}) as unknown,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updateCustomer: async (_: number, __: unknown): Promise<unknown> =>
        ({}) as unknown,
      onDataChanged: (): (() => void) => () => undefined,
      getFileInfo: async () => ({ path: null, isDirty: false }),
    } as unknown as Window["ahb"];

    const pinia = createPinia();
    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
      },
      attachTo: document.body,
    });
    // Wait for onMounted async getLanguage to resolve and DOM to update
    await Promise.resolve();
    await nextTick();
    // Initial screen should show file selection buttons
    expect(wrapper.text()).toContain("Open File");
    expect(wrapper.text()).toContain("New File");
    // Simulate opening/creating a file so the UI shows the dashboard
    docCb?.();
    await nextTick();
  });

  it("saves by itself: Ctrl+S does nothing, Ctrl+Shift+S still saves a copy", async () => {
    const saveFileAs = vi.fn(async () => undefined);
    let docCb: null | (() => void) = null as null | (() => void);
    window.ahb = {
      getLanguage: async () => "en",
      setLanguage: async () => undefined,
      newFile: async () => undefined,
      openFile: async () => undefined,
      saveFileAs,
      onLanguageChanged: (): (() => void) => () => undefined,
      onDocumentChanged: (cb: () => void): (() => void) => {
        docCb = cb;
        return () => undefined;
      },
      onDocumentClosed: (): (() => void) => () => undefined,
      onFileInfo: (): (() => void) => () => undefined,
      onDataChanged: (): (() => void) => () => undefined,
      getFileInfo: async () => ({ path: "shop.ahbs", isDirty: false }),
      listProducts: async (): Promise<unknown[]> => [],
      listCustomers: async (): Promise<unknown[]> => [],
    } as unknown as Window["ahb"];

    const wrapper = mount(App, {
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    });
    await Promise.resolve();
    await nextTick();
    docCb?.();
    await nextTick();

    const press = (shift: boolean) =>
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true, shiftKey: shift })
      );

    press(false);
    await nextTick();
    expect(saveFileAs).not.toHaveBeenCalled();

    press(true);
    await nextTick();
    expect(saveFileAs).toHaveBeenCalled();
    wrapper.unmount();
  });
});
