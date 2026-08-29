import type { AhbDataV1 } from "../data";
import {
  addProduct,
  updateProduct,
  listProducts,
  addCustomer,
  updateCustomer,
  listCustomers,
  postInvoice,
  updateInvoice,
  addInvoicePayment,
  updateInvoicePayment,
  listInvoicesByCustomer,
  listProductSales,
  listProductPurchases,
  postPurchase,
  updatePurchase,
  reportMoneyTransactionsCustomerRange,
  reportMoneyTransactionsDayWise,
  reportDailyPayments,
  reportTotalSell,
  reportClientLedger,
  recordPayment,
} from "../data";
import type { FileService } from "./FileService";
import { DataIndex } from "../utils/dataIndex";

export class DataService {
  private index = new DataIndex();

  constructor(private fileService: FileService) {
    // Build initial index
    this.rebuildIndex();
  }

  /**
   * Rebuild search indexes after file operations
   */
  rebuildIndex(): void {
    this.index.rebuild(this.getData());
  }

  /**
   * Get product by ID using index (O(1))
   */
  getProductById(id: number) {
    return this.index.getProduct(id);
  }

  /**
   * Get customer by ID using index (O(1))
   */
  getCustomerById(id: number) {
    return this.index.getCustomer(id);
  }

  private getData(): AhbDataV1 {
    return this.fileService.getCurrentDoc().data as AhbDataV1;
  }

  // Marking dirty is also what schedules the file's automatic save. Nothing in
  // the menu depends on the dirty flag any more, so it is not rebuilt here.
  private markDirty(): void {
    this.fileService.setDirty(true);
    this.fileService.broadcastFileInfo();
  }

  // Products
  listProducts(opts?: boolean | { activeOnly?: boolean }) {
    const activeOnly = typeof opts === "boolean" ? opts : opts?.activeOnly;
    return listProducts(this.getData(), { activeOnly });
  }

  addProduct(p: Parameters<typeof addProduct>[1]) {
    const prod = addProduct(this.getData(), p);
    this.index.updateProduct(prod);
    this.fileService.notifyDataChanged({
      kind: "product",
      action: "add",
      id: prod.id,
    });
    this.markDirty();
    return prod;
  }

  updateProduct(id: number, patch: Parameters<typeof updateProduct>[2]) {
    const prod = updateProduct(this.getData(), id, patch);
    this.index.updateProduct(prod);
    this.fileService.notifyDataChanged({
      kind: "product",
      action: "update",
      id,
    });
    this.markDirty();
    return prod;
  }

  // Customers
  listCustomers(opts?: boolean | { activeOnly?: boolean }) {
    const activeOnly = typeof opts === "boolean" ? opts : opts?.activeOnly;
    return listCustomers(this.getData(), { activeOnly });
  }

  addCustomer(c: Parameters<typeof addCustomer>[1]) {
    const cust = addCustomer(this.getData(), c);
    this.index.updateCustomer(cust);
    this.fileService.notifyDataChanged({
      kind: "customer",
      action: "add",
      id: cust.id,
    });
    this.markDirty();
    return cust;
  }

  updateCustomer(id: number, patch: Parameters<typeof updateCustomer>[2]) {
    const cust = updateCustomer(this.getData(), id, patch);
    this.index.updateCustomer(cust);
    this.fileService.notifyDataChanged({
      kind: "customer",
      action: "update",
      id,
    });
    this.markDirty();
    return cust;
  }

  recordPayment(customerId: number, amount: number): void {
    recordPayment(this.getData(), customerId, amount);
    const cust = this.getData().customers.find((c) => c.id === customerId);
    if (cust) this.index.updateCustomer(cust);
    this.fileService.notifyDataChanged({
      kind: "customer",
      action: "update",
      id: customerId,
    });
    this.markDirty();
  }

  // Invoices
  postInvoice(payload: Parameters<typeof postInvoice>[1]) {
    // Posting to an empty slot creates the customer, which the index has
    // never seen before
    const isNewCustomer =
      payload.customerId != null && !this.index.getCustomer(payload.customerId);
    const inv = postInvoice(this.getData(), payload);

    // Update indexes. Stock and outstanding are applied by replacing the
    // entries in `data`, so the fresh objects have to be re-read from there
    // rather than pulled back out of the index.
    const data = this.getData();
    this.index.addInvoice(inv);
    inv.lines.forEach((ln) => {
      const prod = data.products.find((p) => p.id === ln.productId);
      if (prod) this.index.updateProduct(prod);
    });
    if (inv.customerId != null) {
      const cust = data.customers.find((c) => c.id === inv.customerId);
      if (cust) this.index.updateCustomer(cust);
    }

    this.fileService.notifyDataChanged({
      kind: "invoice",
      action: "post",
      id: inv.no,
    });
    // Notify product stock changes
    inv.lines.forEach((ln) =>
      this.fileService.notifyDataChanged({
        kind: "product",
        action: "stock-updated",
        id: ln.productId,
      })
    );
    // Notify customer outstanding update
    if (inv.customerId != null) {
      this.fileService.notifyDataChanged({
        kind: "customer",
        action: isNewCustomer ? "add" : "update",
        id: inv.customerId,
      });
    }
    this.markDirty();
    return inv;
  }

  updateInvoice(
    invoiceId: string,
    payload: Parameters<typeof updateInvoice>[2]
  ) {
    const data = this.getData();
    const old = data.invoices?.find((i) => i.id === invoiceId);
    const inv = updateInvoice(data, invoiceId, payload);

    // Old and new lines may touch different products; rebuild for correctness
    this.rebuildIndex();

    this.fileService.notifyDataChanged({
      kind: "invoice",
      action: "update",
      id: inv.no,
    });
    const productIds = new Set<number>([
      ...(old?.lines.map((l) => l.productId) ?? []),
      ...inv.lines.map((l) => l.productId),
    ]);
    for (const id of productIds) {
      this.fileService.notifyDataChanged({
        kind: "product",
        action: "stock-updated",
        id,
      });
    }
    if (inv.customerId != null) {
      this.fileService.notifyDataChanged({
        kind: "customer",
        action: "update",
        id: inv.customerId,
      });
    }
    this.markDirty();
    return inv;
  }

  getInvoiceById(invoiceId: string) {
    return this.getData().invoices?.find((i) => i.id === invoiceId) ?? null;
  }

  addInvoicePayment(
    invoiceId: string,
    payload: Parameters<typeof addInvoicePayment>[2]
  ) {
    return this.notifyPaymentChange(
      addInvoicePayment(this.getData(), invoiceId, payload)
    );
  }

  updateInvoicePayment(
    invoiceId: string,
    payload: Parameters<typeof updateInvoicePayment>[2]
  ) {
    return this.notifyPaymentChange(
      updateInvoicePayment(this.getData(), invoiceId, payload)
    );
  }

  private notifyPaymentChange(inv: ReturnType<typeof addInvoicePayment>) {
    // The invoice and customer objects are replaced in the data arrays
    this.rebuildIndex();
    this.fileService.notifyDataChanged({
      kind: "invoice",
      action: "payment",
      id: inv.no,
    });
    if (inv.customerId != null) {
      this.fileService.notifyDataChanged({
        kind: "customer",
        action: "update",
        id: inv.customerId,
      });
    }
    this.markDirty();
    return inv;
  }

  listInvoicesByCustomer(customerId: number) {
    return listInvoicesByCustomer(this.getData(), customerId);
  }

  listProductSales(productId: number) {
    return listProductSales(this.getData(), productId);
  }

  listProductPurchases(productId: number) {
    return listProductPurchases(this.getData(), productId);
  }

  // Purchases
  postPurchase(payload: Parameters<typeof postPurchase>[1]) {
    const purchase = postPurchase(this.getData(), payload);

    // Update product index. postPurchase replaces the entry in `data` to bump
    // stock, so the fresh object has to be re-read from there rather than
    // pulled back out of the index.
    const prod = this.getData().products.find(
      (p) => p.id === purchase.productId
    );
    if (prod) this.index.updateProduct(prod);

    this.fileService.notifyDataChanged({
      kind: "purchase",
      action: "post",
      id: purchase.productId,
    });
    // Notify product stock update
    this.fileService.notifyDataChanged({
      kind: "product",
      action: "stock-updated",
      id: purchase.productId,
    });
    this.markDirty();
    return purchase;
  }

  updatePurchase(id: string, payload: Parameters<typeof updatePurchase>[2]) {
    const purchase = updatePurchase(this.getData(), id, payload);

    // Same as postPurchase: the stock bump replaced the product object, so the
    // index has to be fed the one now in `data`
    const prod = this.getData().products.find(
      (p) => p.id === purchase.productId
    );
    if (prod) this.index.updateProduct(prod);

    this.fileService.notifyDataChanged({
      kind: "purchase",
      action: "update",
      id: purchase.productId,
    });
    this.fileService.notifyDataChanged({
      kind: "product",
      action: "stock-updated",
      id: purchase.productId,
    });
    this.markDirty();
    return purchase;
  }

  // Reports
  reportMoneyTransactionsCustomerRange(from: string, to: string) {
    return reportMoneyTransactionsCustomerRange(this.getData(), from, to);
  }

  reportMoneyTransactionsDayWise(from: string, to: string) {
    return reportMoneyTransactionsDayWise(this.getData(), from, to);
  }

  reportDailyPayments(date: string) {
    return reportDailyPayments(this.getData(), date);
  }

  reportTotalSell(from: string, to: string) {
    return reportTotalSell(this.getData(), from, to);
  }

  reportClientLedger(from: string, to: string, customerId?: number) {
    return reportClientLedger(this.getData(), from, to, customerId);
  }
}
