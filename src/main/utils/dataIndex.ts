/**
 * Index maps for O(1) data lookups
 * Replaces O(n) array.find() operations
 */

import type { AhbDataV1, Product, Customer, Invoice } from "../data";

export class DataIndex {
  private productMap = new Map<number, Product>();
  private customerMap = new Map<number, Customer>();
  private invoicesByCustomer = new Map<number, Invoice[]>();

  /**
   * Rebuild all indexes from data
   */
  rebuild(data: AhbDataV1): void {
    // Clear existing indexes
    this.productMap.clear();
    this.customerMap.clear();
    this.invoicesByCustomer.clear();

    // Index products
    for (const product of data.products) {
      this.productMap.set(product.id, product);
    }

    // Index customers
    for (const customer of data.customers) {
      this.customerMap.set(customer.id, customer);
    }

    // Index invoices by customer
    if (data.invoices) {
      for (const invoice of data.invoices) {
        if (invoice.customerId != null) {
          const existing =
            this.invoicesByCustomer.get(invoice.customerId) || [];
          existing.push(invoice);
          this.invoicesByCustomer.set(invoice.customerId, existing);
        }
      }
    }
  }

  /**
   * Get product by ID (O(1))
   */
  getProduct(id: number): Product | undefined {
    return this.productMap.get(id);
  }

  /**
   * Get customer by ID (O(1))
   */
  getCustomer(id: number): Customer | undefined {
    return this.customerMap.get(id);
  }

  /**
   * Get invoices for customer (O(1))
   */
  getCustomerInvoices(customerId: number): Invoice[] {
    return this.invoicesByCustomer.get(customerId) || [];
  }

  /**
   * Update product in index
   */
  updateProduct(product: Product): void {
    this.productMap.set(product.id, product);
  }

  /**
   * Update customer in index
   */
  updateCustomer(customer: Customer): void {
    this.customerMap.set(customer.id, customer);
  }

  /**
   * Add invoice to index
   */
  addInvoice(invoice: Invoice): void {
    if (invoice.customerId != null) {
      const existing = this.invoicesByCustomer.get(invoice.customerId) || [];
      existing.push(invoice);
      this.invoicesByCustomer.set(invoice.customerId, existing);
    }
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.productMap.clear();
    this.customerMap.clear();
    this.invoicesByCustomer.clear();
  }
}
