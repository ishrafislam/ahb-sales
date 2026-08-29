import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SelectPrint from "../../src/views/SelectPrint.vue";
import { currentLang } from "../../src/i18n";

describe("Select print window", () => {
  const openPrintPreview = vi.fn();
  const readClipboardText = vi.fn();
  const close = vi.fn();

  beforeEach(() => {
    currentLang.value = "en";
    openPrintPreview.mockReset().mockResolvedValue("job-1");
    readClipboardText.mockReset().mockResolvedValue("");
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      openPrintPreview,
      readClipboardText,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  function mountView() {
    return mount(SelectPrint, { attachTo: document.body });
  }

  type View = ReturnType<typeof mountView>;

  const field = (wrapper: View, id: string) =>
    wrapper.find(`#${id}`).element as HTMLInputElement;

  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;

  const rows = (wrapper: View) =>
    wrapper
      .findAll('tr[data-row="grid"]')
      .map((r) => r.findAll("td").map((c) => c.text()));

  async function paste(text: string) {
    const event = new Event("paste") as Event & {
      clipboardData: { getData: () => string };
    };
    (event as { clipboardData?: unknown }).clipboardData = {
      getData: () => text,
    };
    document.dispatchEvent(event);
    await new Promise((r) => setTimeout(r, 0));
  }

  it("opens on today's date, godown 0 and an empty table", () => {
    const wrapper = mountView();

    expect(field(wrapper, "sheet-date").value).toBe(
      new Date().toLocaleDateString("en-GB")
    );
    expect(field(wrapper, "sheet-godown").value).toBe("0");
    expect(rows(wrapper).length).toBe(0);
    expect(
      (button(wrapper, "Print").element as HTMLButtonElement).disabled
    ).toBe(true);
    wrapper.unmount();
  });

  it("appends what is pasted, paste after paste", async () => {
    const wrapper = mountView();

    await paste("5\tRice\t3\tkg");
    expect(rows(wrapper)).toEqual([["5", "Rice", "3", "kg"]]);

    await paste("7\tDal\t2.5\tkg\n9\tOil\t1\tL");
    expect(rows(wrapper).map((r) => r[0])).toEqual(["5", "7", "9"]);
    expect(
      (button(wrapper, "Print").element as HTMLButtonElement).disabled
    ).toBe(false);
    wrapper.unmount();
  });

  it("shows the sheet in the app's numerals", async () => {
    currentLang.value = "bn";
    const wrapper = mountView();

    await paste("5\tচাল\t3\tkg");
    expect(rows(wrapper)).toEqual([["৫", "চাল", "৩", "kg"]]);
    expect(field(wrapper, "sheet-godown").value).toBe("০");
    currentLang.value = "en";
    wrapper.unmount();
  });

  it("prints the date, the godown and every row", async () => {
    const wrapper = mountView();
    await paste("5\tRice\t3\tkg\n7\tDal\t2\tkg");

    await wrapper.find("#sheet-godown").setValue("4");
    await button(wrapper, "Print").trigger("click");

    expect(openPrintPreview).toHaveBeenCalledTimes(1);
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
    };
    expect(doc.title).toBe("Select Print");
    expect(doc.bodyHtml).toContain("Godown : 4");
    expect(doc.bodyHtml).toContain(new Date().toLocaleDateString("en-GB"));
    expect(doc.bodyHtml).toContain("Rice");
    expect(doc.bodyHtml).toContain("Dal");
    wrapper.unmount();
  });

  it("Close closes the window", async () => {
    const wrapper = mountView();
    await button(wrapper, "Close").trigger("click");

    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("falls back to the main process when a Ctrl+V carries no payload", async () => {
    readClipboardText.mockResolvedValue("5\tRice\t3\tkg");
    const wrapper = mountView();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "v", ctrlKey: true })
    );
    await new Promise((r) => setTimeout(r, 0));

    expect(rows(wrapper)).toEqual([["5", "Rice", "3", "kg"]]);
    wrapper.unmount();
  });
});
