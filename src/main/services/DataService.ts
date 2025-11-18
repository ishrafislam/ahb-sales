import type { AhbDataV1 } from "../data";
import {
  addProduct,
  updateProduct,
  listProducts,
  addCustomer,
  updateCustomer,
  listCustomers,
  postInvoice,
  listInvoicesByCustomer,
  listProductSales,
  listProductPurchases,
  postPurchase,
  reportMoneyTransactionsCustomerRange,
  reportMoneyTransactionsDayWise,
  reportDailyPayments,
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

  // Invoices
  postInvoice(payload: Parameters<typeof postInvoice>[1]) {
    const inv = postInvoice(this.getData(), payload);

    // Update indexes
    this.index.addInvoice(inv);
    inv.lines.forEach((ln) => {
      const prod = this.index.getProduct(ln.productId);
      if (prod) this.index.updateProduct(prod);
    });
    if (inv.customerId != null) {
      const cust = this.index.getCustomer(inv.customerId);
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

    // Update product index
    const prod = this.index.getProduct(purchase.productId);
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
}
