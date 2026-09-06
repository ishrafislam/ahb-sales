import { describe, it, expect } from "vitest";
import {
  initData,
  addProduct,
  addCustomer,
  saveInvoiceDraft,
  getInvoiceDraft,
  deleteInvoiceDraft,
  type AhbDataV1,
} from "../src/main/data";

process.env.AHB_KEY_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function setup() {
  const data: AhbDataV1 = initData();
  addProduct(data, { id: 1, nameBn: "চিনি", unit: "kg", price: 100, stock: 10 });
  addProduct(data, { id: 2, nameBn: "Oil", unit: "ltr", price: 80, stock: 5 });
  addCustomer(data, { id: 1, nameBn: "Rahim", outstanding: 50 });
  return data;
}

describe("invoice drafts", () => {
  it("saves and reads back a customer's unposted entry", () => {
    const data = setup();
    const saved = saveInvoiceDraft(data, {
      customerId: 1,
      lines: [
        { productId: 1, quantity: 3, rate: 100 },
        { productId: 2, quantity: null, rate: null },
      ],
      discount: 20,
      notes: "  half done  ",
    });

    expect(saved).toBeTruthy();
    expect(saved!.notes).toBe("half done");
    expect(saved!.updatedAt).toBeTruthy();

    const draft = getInvoiceDraft(data, 1)!;
    expect(draft.lines).toEqual([
      { productId: 1, quantity: 3, rate: 100 },
      // A half-typed line survives as it was left
      { productId: 2, quantity: null, rate: null },
    ]);
    expect(draft.discount).toBe(20);
    expect(getInvoiceDraft(data, 2)).toBeNull();
  });

  it("moves no money: no invoice, no stock and no outstanding change", () => {
    const data = setup();
    saveInvoiceDraft(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 3, rate: 100 }],
      discount: 0,
    });

    expect(data.invoices).toEqual([]);
    expect(data.invoiceSeq).toBe(1);
    expect(data.products.find((p) => p.id === 1)!.stock).toBe(10);
    expect(data.customers.find((c) => c.id === 1)!.outstanding).toBe(50);
  });

  it("keeps one draft per customer, replacing the earlier one", () => {
    const data = setup();
    saveInvoiceDraft(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1, rate: 100 }],
      discount: 0,
    });
    saveInvoiceDraft(data, {
      customerId: 1,
      lines: [{ productId: 2, quantity: 2, rate: 80 }],
      discount: 0,
    });
    saveInvoiceDraft(data, {
      customerId: 7,
      lines: [{ productId: 1, quantity: 5, rate: 100 }],
      discount: 0,
    });

    expect(data.drafts).toHaveLength(2);
    expect(getInvoiceDraft(data, 1)!.lines).toEqual([
      { productId: 2, quantity: 2, rate: 80 },
    ]);
  });

  it("carries the invoice id of an unposted edit", () => {
    const data = setup();
    saveInvoiceDraft(data, {
      customerId: 1,
      invoiceId: "inv-1",
      lines: [{ productId: 1, quantity: 1, rate: 100 }],
      discount: 0,
    });
    expect(getInvoiceDraft(data, 1)!.invoiceId).toBe("inv-1");
  });

  it("an empty draft deletes the stored one instead of saving nothing", () => {
    const data = setup();
    saveInvoiceDraft(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1, rate: 100 }],
      discount: 0,
    });

    const cleared = saveInvoiceDraft(data, {
      customerId: 1,
      lines: [],
      discount: 0,
    });
    expect(cleared).toBeNull();
    expect(getInvoiceDraft(data, 1)).toBeNull();
    expect(data.drafts).toEqual([]);
  });

  it("deleteInvoiceDraft reports whether there was one", () => {
    const data = setup();
    saveInvoiceDraft(data, {
      customerId: 1,
      lines: [{ productId: 1, quantity: 1, rate: 100 }],
      discount: 0,
    });
    expect(deleteInvoiceDraft(data, 1)).toBe(true);
    expect(deleteInvoiceDraft(data, 1)).toBe(false);
  });

  it("rejects ids outside the customer and product ranges", () => {
    const data = setup();
    expect(() =>
      saveInvoiceDraft(data, {
        customerId: 0,
        lines: [{ productId: 1, quantity: 1, rate: 100 }],
        discount: 0,
      })
    ).toThrow(/Customer ID out of range/);
    expect(() =>
      saveInvoiceDraft(data, {
        customerId: 1,
        lines: [{ productId: 0, quantity: 1, rate: 100 }],
        discount: 0,
      })
    ).toThrow(/Product ID must be an integer/);
  });

  it("fills the drafts array in for a file saved before drafts existed", () => {
    const data = setup();
    delete (data as { drafts?: unknown }).drafts;
    expect(getInvoiceDraft(data, 1)).toBeNull();
    expect(data.drafts).toEqual([]);
  });
});
