import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";

// Minimal SFC test ensuring component renders and language switch updates title

describe("App.vue", () => {
  it("renders and updates title on language change", async () => {
    // Stub preload API
    let langCb: ((l: "bn" | "en") => void) | null = null;
    let docCb: (() => void) | null = null;
    window.ahb = {
      getLanguage: async () => "en",
      setLanguage: async (l: "bn" | "en") => {
        if (langCb) {
          langCb(l);
        }
      },
      newFile: async () => {
        if (docCb) docCb();
      },
      openFile: async () => {
        if (docCb) docCb();
      },
      saveFile: async () => Promise.resolve(),
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
      addProduct: async (_p: unknown): Promise<unknown> => ({}) as unknown,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updateProduct: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _id: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _patch: unknown
      ): Promise<unknown> => ({}) as unknown,
      listCustomers: async (): Promise<unknown[]> => [],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      addCustomer: async (_c: unknown): Promise<unknown> => ({}) as unknown,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updateCustomer: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _id: number,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _patch: unknown
      ): Promise<unknown> => ({}) as unknown,
      onDataChanged: (): (() => void) => () => undefined,
    } as unknown as Window["ahb"];

    const wrapper = mount(App, { attachTo: document.body });
    // Wait for onMounted async getLanguage to resolve and DOM to update
    await Promise.resolve();
    await nextTick();
    expect(wrapper.text()).toContain("AHB Sales");
    // Simulate opening/creating a file so the UI shows the language select
    docCb?.();
    await nextTick();

    const select = wrapper.find("select");
    await select.setValue("bn");
    await select.trigger("change");
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toContain("এএইচবি সেলস");
  });
});
