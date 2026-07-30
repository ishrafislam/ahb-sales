import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import ReportRange from "../../src/views/ReportRange.vue";
import { currentLang } from "../../src/i18n";

describe("Report range window", () => {
  const reportTotalSell = vi.fn();
  const reportMoneyTransactionsDayWise = vi.fn();
  const openPrintPreview = vi.fn();
  const close = vi.fn();

  // Fixed "now" so the defaults and the shortcuts are predictable
  const NOW = new Date(2026, 6, 30, 12, 0, 0); // 30/07/2026

  beforeEach(() => {
    currentLang.value = "en";
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    reportTotalSell.mockReset().mockResolvedValue({
      days: [
        {
          date: "30-07-2026",
          rows: [
            { productId: 1, productNameBn: "চাল", unit: "kg", quantity: 15 },
          ],
        },
      ],
    });
    reportMoneyTransactionsDayWise.mockReset().mockResolvedValue({
      days: [
        {
          date: "30-07-2026",
          rows: [
            {
              customerId: 40,
              customerName: "আলাউদ্দিন বেকারী",
              bill: 8220,
              discount: 0,
              netBill: 8220,
              paid: 8220,
              due: 0,
              previousDue: 0,
              totalDue: 0,
              hasInvoice: true,
            },
          ],
          totals: {
            bill: 8220,
            discount: 0,
            netBill: 8220,
            paid: 8220,
            due: 0,
          },
        },
      ],
    });
    openPrintPreview.mockReset().mockResolvedValue("job-1");
    close.mockReset();
    (window as unknown as { ahb: unknown }).ahb = {
      reportTotalSell,
      reportMoneyTransactionsDayWise,
      openPrintPreview,
    };
    vi.spyOn(window, "close").mockImplementation(close);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountView(report: "total-sell" | "daily-report" = "total-sell") {
    return mount(ReportRange, { attachTo: document.body, props: { report } });
  }

  type View = ReturnType<typeof mountView>;

  const start = (wrapper: View) =>
    wrapper.find("#range-start").element as HTMLInputElement;
  const end = (wrapper: View) =>
    wrapper.find("#range-end").element as HTMLInputElement;
  const button = (wrapper: View, label: string) =>
    wrapper.findAll("button").find((b) => b.text() === label)!;

  it("defaults both dates to today", () => {
    const wrapper = mountView();

    expect(start(wrapper).value).toBe("30/07/2026");
    expect(end(wrapper).value).toBe("30/07/2026");
    wrapper.unmount();
  });

  it("Yesterday and Today set both fields", async () => {
    const wrapper = mountView();

    await button(wrapper, "Yesterday").trigger("click");
    expect(start(wrapper).value).toBe("29/07/2026");
    expect(end(wrapper).value).toBe("29/07/2026");

    await button(wrapper, "Today").trigger("click");
    expect(start(wrapper).value).toBe("30/07/2026");
    expect(end(wrapper).value).toBe("30/07/2026");
    wrapper.unmount();
  });

  it("steps both dates when no field has focus", async () => {
    const wrapper = mountView();
    const step = async (label: string) =>
      button(wrapper, label).trigger("click");

    await step("<D");
    expect([start(wrapper).value, end(wrapper).value]).toEqual([
      "29/07/2026",
      "29/07/2026",
    ]);

    await step("<W");
    expect(start(wrapper).value).toBe("22/07/2026");

    await step("<M");
    expect(start(wrapper).value).toBe("22/06/2026");

    await step("<Y");
    expect(start(wrapper).value).toBe("22/06/2025");

    for (const label of ["Y>", "M>", "W>", "D>"]) await step(label);
    expect([start(wrapper).value, end(wrapper).value]).toEqual([
      "30/07/2026",
      "30/07/2026",
    ]);
    wrapper.unmount();
  });

  it("steps only the focused field and keeps it focused", async () => {
    const wrapper = mountView();
    await wrapper.find("#range-start").trigger("focus");

    // mousedown.prevent stops the click from blurring the input
    const stepButton = button(wrapper, "<D");
    await stepButton.trigger("mousedown");
    await stepButton.trigger("click");

    expect(start(wrapper).value).toBe("29/07/2026");
    expect(end(wrapper).value).toBe("30/07/2026");

    // Still focused, so a second click moves the same field again
    await stepButton.trigger("mousedown");
    await stepButton.trigger("click");
    expect(start(wrapper).value).toBe("28/07/2026");
    expect(end(wrapper).value).toBe("30/07/2026");

    // Focus the end field and it becomes the one that moves
    await wrapper.find("#range-start").trigger("blur");
    await wrapper.find("#range-end").trigger("focus");
    await button(wrapper, "D>").trigger("click");
    expect(start(wrapper).value).toBe("28/07/2026");
    expect(end(wrapper).value).toBe("31/07/2026");
    wrapper.unmount();
  });

  it("blocks Okay for an unparseable date", async () => {
    const wrapper = mountView();
    await wrapper.find("#range-start").setValue("31/02/2026");

    expect(
      (button(wrapper, "Okay").element as HTMLButtonElement).disabled
    ).toBe(true);
    expect(wrapper.text()).toContain("DD/MM/YYYY");
    await button(wrapper, "Okay").trigger("click");
    expect(reportTotalSell).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("blocks Okay when the end date precedes the start", async () => {
    const wrapper = mountView();
    await wrapper.find("#range-end").setValue("29/07/2026");

    expect(
      (button(wrapper, "Okay").element as HTMLButtonElement).disabled
    ).toBe(true);
    expect(wrapper.text()).toContain("cannot be before");
    wrapper.unmount();
  });

  it("Okay reports the range and opens the print preview", async () => {
    const wrapper = mountView();
    await wrapper.find("#range-start").setValue("10/07/2026");
    await wrapper.find("#range-end").setValue("30/07/2026");

    await button(wrapper, "Okay").trigger("click");
    await vi.runAllTimersAsync();

    expect(reportTotalSell).toHaveBeenCalledWith("2026-07-10", "2026-07-30");
    expect(openPrintPreview).toHaveBeenCalledTimes(1);
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
    };
    expect(doc.title).toBe("Total Sell");
    expect(doc.bodyHtml).toContain("Date : Thursday, July 30, 2026");
    expect(doc.bodyHtml).toContain("চাল");
    expect(doc.bodyHtml).toContain('<td class="qty">15</td>');
    expect(doc.bodyHtml).toContain('<td class="unit">kg</td>');
    // The range itself is not printed
    expect(doc.bodyHtml).not.toContain("10/07/2026");
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("builds the daily report instead when that is the window's report", async () => {
    const wrapper = mountView("daily-report");
    await wrapper.find("#range-start").setValue("10/07/2026");

    await button(wrapper, "Okay").trigger("click");
    await vi.runAllTimersAsync();

    expect(reportMoneyTransactionsDayWise).toHaveBeenCalledWith(
      "2026-07-10",
      "2026-07-30"
    );
    expect(reportTotalSell).not.toHaveBeenCalled();
    const doc = openPrintPreview.mock.calls[0]![0] as {
      title: string;
      bodyHtml: string;
      columns?: number;
    };
    expect(doc.title).toBe("Daily Report");
    expect(doc.bodyHtml).toContain("আলাউদ্দিন বেকারী");
    expect(doc.bodyHtml).toContain('<td class="cid">40</td>');
    // The ledger is too wide to split the page
    expect(doc.columns).toBeUndefined();
    expect(close).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("Cancel closes without reporting", async () => {
    const wrapper = mountView();
    await button(wrapper, "Cancel").trigger("click");

    expect(close).toHaveBeenCalled();
    expect(reportTotalSell).not.toHaveBeenCalled();
    expect(reportMoneyTransactionsDayWise).not.toHaveBeenCalled();
    expect(openPrintPreview).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
