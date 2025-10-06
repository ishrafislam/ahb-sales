import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";

// Minimal SFC test ensuring component renders and language switch updates title

describe("App.vue", () => {
  it("renders and updates title on language change", async () => {
    // Stub preload API
    // @ts-expect-error - define test stub
    let langCb: ((l: "bn" | "en") => void) | null = null;
    window.ahb = {
      getLanguage: async () => "en",
      setLanguage: async (l: "bn" | "en") => {
        if (langCb) {
          langCb(l);
        }
      },
      newFile: async () => Promise.resolve(),
      openFile: async () => Promise.resolve(),
      saveFile: async () => Promise.resolve(),
      saveFileAs: async () => Promise.resolve(),
      onLanguageChanged: (cb: (l: "bn" | "en") => void) => {
        langCb = cb;
        return () => {
          langCb = null;
        };
      },
      onDocumentChanged: (): (() => void) => {
        return () => undefined;
      },
    } as unknown as Window["ahb"];

    const wrapper = mount(App, { attachTo: document.body });
    // Wait for onMounted async getLanguage to resolve and DOM to update
    await Promise.resolve();
    await nextTick();
    expect(wrapper.text()).toContain("AHB Sales");

    const select = wrapper.find("select");
    await select.setValue("bn");
    await select.trigger("change");
    await nextTick();
    await nextTick();
    expect(wrapper.text()).toContain("এএইচবি সেলস");
  });
});
