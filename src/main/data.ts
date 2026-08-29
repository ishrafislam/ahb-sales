import {
  MIN_PRODUCT_ID,
  MAX_PRODUCT_ID,
  MIN_CUSTOMER_ID,
  MAX_CUSTOMER_ID,
} from "../constants/business";
import { nowIso, toDDMMYYYY } from "../utils/date";

export type Lang = "bn" | "en";

export type Product = {
  id: number; // 1..1000 enforced
  nameBn: string;
  nameEn?: string;
  description?: string;
  unit: string; // single unit
  price: number; // unit price
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: number;
  nameBn: string;
  nameEn?: string;
  address?: string;
  phone?: string;
  outstanding: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AhbDataV1 = {
  products: Product[];
  customers: Customer[];
  // Phase 2 additions (additive; safe for older files after migration)
  invoices?: Invoice[];
  invoiceSeq?: number; // next invoice number to assign
  payments?: Payment[];
};

export function initData(): AhbDataV1 {
  return {
    products: [],
    customers: [],
    invoices: [],
    invoiceSeq: 1,
    payments: [],
  };
}

// Helpers
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
// A report's DD-MM-YYYY back to a sortable YYYY-MM-DD
const ymdOf = (ddMmYyyy: string) => ddMmYyyy.split("-").reverse().join("-");
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const isoToYmd = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Ensure Phase 2 fields exist on data object for older files
export type AhbDataV2 = Required<Pick<AhbDataV1, "invoices" | "invoiceSeq">> &
  Pick<AhbDataV1, "products" | "customers" | "payments">;

export function ensurePhase2(data: AhbDataV1): asserts data is AhbDataV2 {
  if (!data.invoices) {
    (data as AhbDataV1 & { invoices: Invoice[] }).invoices = [];
  }
  if (typeof data.invoiceSeq !== "number") {
    (data as AhbDataV1 & { invoiceSeq: number }).invoiceSeq = 1;
  }
  if (!data.payments) {
    (data as AhbDataV1 & { payments: Payment[] }).payments = [];
  }
}

// -----------------------
// Phase 2: Invoices
// -----------------------
export type InvoiceLine = {
  sn: number;
  productId: number;
  unit: string;
  description?: string;
  quantity: number;
  rate: number;
  lineTotal: number;
};

export type Invoice = {
  id: string;
  no: number; // human-friendly invoice number
  date: string; // ISO
  customerId: number | null;
  lines: InvoiceLine[];
  discount: number;
  notes?: string;
  totals: { subtotal: number; net: number };
  // Phase 3: Payments & dues
  paid: number; // amount paid against this invoice (may also cover previous due)
  payments?: InvoicePayment[]; // individual payments summing to paid
  previousDue: number; // customer's outstanding before posting this invoice
  currentDue: number; // customer's outstanding after posting this invoice
  status: "posted"; // Phase 2: only posted receipts
  createdAt: string;
  updatedAt: string;
};

export type InvoicePayment = {
  id: string;
  date: string; // ISO
  amount: number;
  notes?: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  date: string; // ISO
  customerId: number;
  amount: number;
  createdAt: string;
};

export type PostInvoiceInput = {
  date?: string;
  customerId: number | null;
  lines: Array<{
    productId: number;
    quantity: number;
    rate?: number;
    description?: string;
  }>;
  discount?: number;
  paid?: number;
  notes?: string;
  // Sell to an empty customer slot: create the customer at that id instead
  // of failing when no record exists yet.
  createMissingCustomer?: boolean;
};

// Shared between postInvoice and updateInvoice: build and validate the
// invoice body (lines, totals, discount, paid, dues) without mutating state.
function buildInvoiceBody(
  data: AhbDataV1,
  input: PostInvoiceInput,
  previousDue: number,
  hasCustomer: boolean,
  allowOverpay = false
) {
  if (!Array.isArray(input.lines) || input.lines.length === 0)
    throw new Error("At least one line item is required");

  // Build lines with defaults and validation
  const lines: InvoiceLine[] = input.lines.map((ln, idx) => {
    const prod = data.products.find((p) => p.id === ln.productId);
    if (!prod) throw new Error(`Product not found: ${ln.productId}`);
    const qty = Number(ln.quantity);
    // Zero is allowed: an item given away is named on the receipt without a
    // quantity or a price against it
    if (!Number.isFinite(qty) || qty < 0)
      throw new Error("Quantity must be >= 0");
    const rate = Number(ln.rate ?? prod.price ?? 0);
    if (!Number.isFinite(rate) || rate < 0)
      throw new Error("Rate must be >= 0");
    const lineTotal = ceil2(qty * rate);
    return {
      sn: idx + 1,
      productId: prod.id,
      unit: prod.unit,
      description: ln.description?.trim() || undefined,
      quantity: qty,
      rate,
      lineTotal,
    };
  });

  const subtotal = ceil2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discount = Number(input.discount ?? 0);
  if (!Number.isFinite(discount) || discount < 0)
    throw new Error("Discount must be a non-negative number");
  if (discount > subtotal) throw new Error("Discount cannot exceed subtotal");
  const net = ceil2(subtotal - discount);
  const paid = Number(input.paid ?? 0);
  if (!Number.isFinite(paid) || paid < 0)
    throw new Error("Paid must be a non-negative number");
  const maxPayable = ceil2(previousDue + net);
  if (!allowOverpay && paid > maxPayable)
    throw new Error("Paid amount cannot exceed previous due plus net bill");
  // With allowOverpay (edit of an invoice carrying accumulated payments), the
  // excess reduces previous due and may go negative (customer credit).
  const invoiceDue = allowOverpay
    ? ceil2(net - paid)
    : Math.max(0, ceil2(net - paid));
  const currentDue = hasCustomer ? ceil2(previousDue + invoiceDue) : 0;

  return { lines, subtotal, discount, net, paid, currentDue };
}

// Adjust product stock by the invoice lines: sign -1 applies the sale
// (decrement), sign +1 reverts it.
function applyStock(data: AhbDataV1, lines: InvoiceLine[], sign: 1 | -1) {
  for (const l of lines) {
    const idx = data.products.findIndex((p) => p.id === l.productId);
    if (idx === -1) continue; // Should not happen as validated earlier
    const prod = data.products[idx];
    if (!prod) continue; // Additional safety check
    data.products[idx] = {
      ...prod,
      stock: prod.stock + sign * l.quantity,
      updatedAt: nowIso(),
    };
  }
}

function setCustomerOutstanding(
  data: AhbDataV1,
  customerId: number,
  outstanding: number
) {
  const custIdx = data.customers.findIndex((c) => c.id === customerId);
  if (custIdx === -1) return;
  data.customers[custIdx] = {
    ...data.customers[custIdx]!,
    outstanding,
    updatedAt: nowIso(),
  };
}

export function postInvoice(data: AhbDataV1, input: PostInvoiceInput): Invoice {
  ensurePhase2(data);
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const hasCustomer =
    input.customerId !== null && input.customerId !== undefined;
  let customer = hasCustomer
    ? data.customers.find((c) => c.id === (input.customerId as number))
    : undefined;
  // Selling to an empty slot creates the customer on the spot; the name and
  // contact details are filled in later from the customer form. The record is
  // only created once the invoice body validates, so a rejected post never
  // leaves a stray customer behind.
  const newCustomerId = hasCustomer && !customer ? (input.customerId as number) : null;
  if (newCustomerId !== null) {
    if (!input.createMissingCustomer) throw new Error("Customer not found");
    if (
      !Number.isInteger(newCustomerId) ||
      newCustomerId < MIN_CUSTOMER_ID ||
      newCustomerId > MAX_CUSTOMER_ID
    ) {
      throw new Error("Customer ID out of range");
    }
  }

  const previousDue = customer ? ceil2(Number(customer.outstanding || 0)) : 0;
  const body = buildInvoiceBody(data, input, previousDue, hasCustomer);
  if (newCustomerId !== null) {
    customer = addCustomer(data, { id: newCustomerId, nameBn: "" });
  }

  // Stock check removed: allow negative stock (policy change)

  // Assign invoice no and id
  const invoiceNo = data.invoiceSeq++;
  const inv: Invoice = {
    id: genId(),
    no: invoiceNo,
    date: date.toISOString(),
    customerId: hasCustomer ? customer!.id : null,
    lines: body.lines,
    discount: body.discount,
    notes: input.notes?.trim() || undefined,
    totals: { subtotal: body.subtotal, net: body.net },
    paid: body.paid,
    previousDue,
    currentDue: body.currentDue,
    status: "posted",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  // Persist, update stock and customer outstanding
  data.invoices.push(inv);
  applyStock(data, body.lines, -1);
  if (hasCustomer && customer) {
    setCustomerOutstanding(data, customer.id, body.currentDue);
  }

  return inv;
}

/**
 * Update the customer's latest invoice in place: reverts the old invoice's
 * stock and outstanding effects, then re-applies with the new input. The
 * stored previousDue snapshot is kept as the recomputation base, so only
 * the latest invoice (highest no for that customer) can be edited safely.
 */
export function updateInvoice(
  data: AhbDataV1,
  invoiceId: string,
  input: PostInvoiceInput
): Invoice {
  ensurePhase2(data);
  const idx = data.invoices.findIndex((i) => i.id === invoiceId);
  if (idx === -1) throw new Error("Invoice not found");
  const old = data.invoices[idx]!;
  const hasNewer = data.invoices.some(
    (i) => i.customerId === old.customerId && i.no > old.no
  );
  if (hasNewer) throw new Error("Only the latest invoice can be edited");

  const hasCustomer = old.customerId !== null;
  // The invoice stays with its original customer; recompute against the
  // stored previousDue snapshot. Validation happens before any mutation.
  const body = buildInvoiceBody(data, input, old.previousDue, hasCustomer, true);

  applyStock(data, old.lines, 1); // revert the old sale
  const updated: Invoice = {
    ...old,
    lines: body.lines,
    discount: body.discount,
    notes: input.notes?.trim() || undefined,
    totals: { subtotal: body.subtotal, net: body.net },
    paid: body.paid,
    currentDue: body.currentDue,
    updatedAt: nowIso(),
  };
  data.invoices[idx] = updated;
  applyStock(data, body.lines, -1);
  if (hasCustomer) {
    setCustomerOutstanding(data, old.customerId!, body.currentDue);
  }

  return updated;
}

export type AddInvoicePaymentInput = {
  amount: number;
  notes?: string;
};

// Shared by addInvoicePayment/updateInvoicePayment: locate and guard the
// invoice, validate the amount, and apply the single payment record.
function applyInvoicePayment(
  data: AhbDataV1,
  invoiceId: string,
  input: AddInvoicePaymentInput,
  buildPayment: (
    existing: InvoicePayment | undefined,
    amount: number,
    notes: string | undefined,
    now: string
  ) => InvoicePayment
): Invoice {
  ensurePhase2(data);
  const idx = data.invoices.findIndex((i) => i.id === invoiceId);
  if (idx === -1) throw new Error("Invoice not found");
  const old = data.invoices[idx]!;
  const hasNewer = data.invoices.some(
    (i) => i.customerId === old.customerId && i.no > old.no
  );
  if (hasNewer)
    throw new Error("Only the latest invoice can receive payments");

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Payment amount must be positive");

  const now = nowIso();
  const payment = buildPayment(
    old.payments?.[0],
    ceil2(amount),
    input.notes?.trim() || undefined,
    now
  );
  const paid = payment.amount;
  const hasCustomer = old.customerId !== null;
  const currentDue = hasCustomer
    ? ceil2(old.previousDue + old.totals.net - paid)
    : 0;
  const updated: Invoice = {
    ...old,
    payments: [payment],
    paid,
    currentDue,
    updatedAt: now,
  };
  data.invoices[idx] = updated;
  if (hasCustomer) {
    setCustomerOutstanding(data, old.customerId!, currentDue);
  }
  return updated;
}

/**
 * Record a payment against an invoice. Every invoice keeps a single
 * payment record: adding merges into it (amounts summed, notes replaced
 * when provided). `paid` mirrors that record; currentDue is recomputed as
 * previousDue + net - paid and may go negative (customer credit) since
 * overpayment is allowed. Restricted to the customer's latest invoice for
 * the same reason as updateInvoice.
 */
export function addInvoicePayment(
  data: AhbDataV1,
  invoiceId: string,
  input: AddInvoicePaymentInput
): Invoice {
  return applyInvoicePayment(
    data,
    invoiceId,
    input,
    (existing, amount, notes, now) =>
      existing
        ? {
            ...existing,
            amount: ceil2(existing.amount + amount),
            notes: notes ?? existing.notes,
            date: now,
          }
        : { id: genId(), date: now, amount, notes, createdAt: now }
  );
}

/**
 * Correct the invoice's single payment record: the amount replaces the
 * previous one (not added), notes are replaced. The record's original
 * date/createdAt are kept.
 */
export function updateInvoicePayment(
  data: AhbDataV1,
  invoiceId: string,
  input: AddInvoicePaymentInput
): Invoice {
  return applyInvoicePayment(
    data,
    invoiceId,
    input,
    (existing, amount, notes) => {
      if (!existing) throw new Error("Invoice has no payment to edit");
      return { ...existing, amount, notes };
    }
  );
}

export function assertProductId(id: number) {
  if (!Number.isInteger(id) || id < MIN_PRODUCT_ID || id > MAX_PRODUCT_ID) {
    throw new Error(
      `Product ID must be an integer between ${MIN_PRODUCT_ID} and ${MAX_PRODUCT_ID}`
    );
  }
}

export type NewProduct = Omit<
  Product,
  "createdAt" | "updatedAt" | "active" | "stock"
> & {
  active?: boolean;
  stock?: number;
};

export function addProduct(data: AhbDataV1, p: NewProduct): Product {
  assertProductId(p.id);
  if (!p.nameBn?.trim()) throw new Error("Product Bengali name is required");
  if (data.products.some((x) => x.id === p.id)) {
    throw new Error("Duplicate product id");
  }
  const parseNumber = (val: unknown, field: string, def = 0): number => {
    if (val === undefined || val === null) return def;
    if (typeof val === "number") {
      if (!Number.isFinite(val)) throw new Error(`${field} must be a number`);
      return val;
    }
    if (typeof val === "string") {
      const s = val.trim();
      if (s === "") return def;
      const n = Number(s);
      if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
      return n;
    }
    throw new Error(`${field} must be a number`);
  };
  const prod: Product = {
    id: p.id,
    nameBn: p.nameBn.trim(),
    nameEn: p.nameEn?.trim() || undefined,
    description: p.description?.trim() || undefined,
    unit: p.unit || "unit",
    price: parseNumber(p.price, "price", 0),
    stock: parseNumber(p.stock, "stock", 0),
    active: p.active ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.products.push(prod);
  return prod;
}

export function updateProduct(
  data: AhbDataV1,
  id: number,
  patch: Partial<Omit<Product, "id" | "createdAt">>
): Product {
  const idx = data.products.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Product not found");
  const old = data.products[idx];
  if (!old) throw new Error("Product not found");
  const next: Product = {
    id: old.id,
    nameBn: patch.nameBn !== undefined ? patch.nameBn : old.nameBn,
    nameEn: patch.nameEn !== undefined ? patch.nameEn : old.nameEn,
    description:
      patch.description !== undefined ? patch.description : old.description,
    unit: patch.unit !== undefined ? patch.unit : old.unit,
    price: patch.price !== undefined ? patch.price : old.price,
    stock: patch.stock !== undefined ? patch.stock : old.stock,
    active: patch.active !== undefined ? patch.active : old.active,
    createdAt: old.createdAt,
    updatedAt: nowIso(),
  };
  data.products[idx] = next;
  return next;
}

export function getProduct(data: AhbDataV1, id: number): Product | undefined {
  return data.products.find((x) => x.id === id);
}

export function listProducts(
  data: AhbDataV1,
  opts?: { activeOnly?: boolean }
): Product[] {
  const arr = data.products.slice();
  return (opts?.activeOnly ? arr.filter((x) => x.active) : arr).sort(
    (a, b) => a.id - b.id
  );
}

export type NewCustomer = Omit<
  Customer,
  "createdAt" | "updatedAt" | "active" | "outstanding"
> & {
  active?: boolean;
  outstanding?: number;
};

export function addCustomer(data: AhbDataV1, c: NewCustomer): Customer {
  if (!Number.isInteger(c.id) || c.id < 1)
    throw new Error("Customer ID must be a positive integer");
  if (data.customers.some((x) => x.id === c.id))
    throw new Error("Duplicate customer id");
  const parseNumber = (val: unknown, field: string, def = 0): number => {
    if (val === undefined || val === null) return def;
    if (typeof val === "number") {
      if (!Number.isFinite(val)) throw new Error(`${field} must be a number`);
      return val;
    }
    if (typeof val === "string") {
      const s = val.trim();
      if (s === "") return def;
      const n = Number(s);
      if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
      return n;
    }
    throw new Error(`${field} must be a number`);
  };
  const cust: Customer = {
    id: c.id,
    nameBn: c.nameBn?.trim() ?? "",
    nameEn: c.nameEn?.trim() || undefined,
    address: c.address?.trim() || undefined,
    phone: (() => {
      if (c.phone === undefined || c.phone === null) return undefined;
      const trimmed = c.phone.toString().trim().slice(0, 50);
      return trimmed ? trimmed : undefined;
    })(),
    outstanding: parseNumber(c.outstanding, "outstanding", 0),
    active: c.active ?? true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.customers.push(cust);
  return cust;
}

export function updateCustomer(
  data: AhbDataV1,
  id: number,
  patch: Partial<Omit<Customer, "id" | "createdAt">>
): Customer {
  const idx = data.customers.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Customer not found");
  const old = data.customers[idx];
  if (!old) throw new Error("Customer not found");
  // Policy: Outstanding can only be set during creation; editing later is not allowed
  if (Object.prototype.hasOwnProperty.call(patch, "outstanding")) {
    throw new Error("Outstanding can only be set when creating a customer");
  }
  const next: Customer = { ...old, updatedAt: nowIso() };
  // Apply simple merges
  if (patch.nameBn !== undefined) next.nameBn = patch.nameBn;
  if (patch.nameEn !== undefined) next.nameEn = patch.nameEn;
  if (patch.address !== undefined) next.address = patch.address;
  if (patch.active !== undefined) next.active = patch.active;
  // Normalize phone length and trimming
  if (Object.prototype.hasOwnProperty.call(patch, "phone")) {
    const raw = (patch as Partial<Customer>).phone;
    if (raw === undefined || raw === null) {
      next.phone = undefined;
    } else {
      const trimmed = raw.toString().trim().slice(0, 50);
      next.phone = trimmed ? trimmed : undefined;
    }
  }
  data.customers[idx] = next;
  return next;
}

export function getCustomer(data: AhbDataV1, id: number): Customer | undefined {
  return data.customers.find((x) => x.id === id);
}

export function listCustomers(
  data: AhbDataV1,
  opts?: { activeOnly?: boolean }
): Customer[] {
  const arr = data.customers.slice();
  return (opts?.activeOnly ? arr.filter((x) => x.active) : arr).sort(
    (a, b) => a.id - b.id
  );
}

export function recordPayment(
  data: AhbDataV1,
  customerId: number,
  amount: number,
  date?: string
): Payment {
  const custIdx = data.customers.findIndex((c) => c.id === customerId);
  if (custIdx === -1) throw new Error("Customer not found");
  const customer = data.customers[custIdx]!;
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Payment amount must be positive");
  if (amount > customer.outstanding)
    throw new Error("Payment amount exceeds outstanding due");
  data.customers[custIdx] = {
    ...customer,
    outstanding: ceil2(customer.outstanding - amount),
    updatedAt: nowIso(),
  };
  if (!data.payments) data.payments = [];
  const now = nowIso();
  const payment: Payment = {
    id: genId(),
    date: date ?? now,
    customerId,
    amount: ceil2(amount),
    createdAt: now,
  };
  data.payments.push(payment);
  return payment;
}

// -----------------------
// Phase 3: History helpers
// -----------------------
export function listInvoicesByCustomer(
  data: AhbDataV1,
  customerId: number
): Invoice[] {
  ensurePhase2(data);
  return data.invoices
    .filter((inv) => inv.customerId === customerId)
    .slice()
    .sort((a, b) => b.no - a.no);
}

export type ProductSaleLine = {
  date: string;
  invoiceNo: number;
  productId: number;
  productNameBn?: string;
  unit: string;
  quantity: number;
  rate: number;
  lineTotal: number;
  customerId: number; // 0 indicates anonymous (no customer)
  customerNameBn?: string;
};

export function listProductSales(
  data: AhbDataV1,
  productId: number
): ProductSaleLine[] {
  ensurePhase2(data);
  const prod = data.products.find((p) => p.id === productId);
  const mapCust = new Map<number, string>(
    data.customers.map((c) => [c.id, c.nameBn])
  );
  const res: ProductSaleLine[] = [];
  for (const inv of data.invoices) {
    for (const ln of inv.lines) {
      if (ln.productId === productId) {
        res.push({
          date: inv.date,
          invoiceNo: inv.no,
          productId,
          productNameBn: prod?.nameBn,
          unit: ln.unit,
          quantity: ln.quantity,
          rate: ln.rate,
          lineTotal: ln.lineTotal,
          customerId: inv.customerId ?? 0,
          customerNameBn:
            inv.customerId != null ? mapCust.get(inv.customerId) : undefined,
        });
      }
    }
  }
  return res.sort((a, b) => b.invoiceNo - a.invoiceNo);
}

export type ProductPurchaseLine = {
  date: string;
  productId: number;
  productNameBn?: string;
  unit: string;
  quantity: number;
};

export function listProductPurchases(
  data: AhbDataV1,
  productId: number
): ProductPurchaseLine[] {
  ensurePhase3(data);
  const prod = data.products.find((p) => p.id === productId);
  return data.purchases
    .filter((p) => p.productId === productId)
    .map((p) => ({
      date: p.date,
      productId: p.productId,
      productNameBn: prod?.nameBn,
      unit: p.unit,
      quantity: p.quantity,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// -----------------------
// Phase 3: Purchases
// -----------------------
export type Purchase = {
  id: string;
  date: string; // ISO
  productId: number;
  unit: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PostPurchaseInput = {
  date?: string;
  productId: number;
  quantity: number;
  notes?: string;
};

export type AhbDataV3 = AhbDataV2 & {
  purchases: Purchase[];
};

export function ensurePhase3(data: AhbDataV1): asserts data is AhbDataV3 {
  ensurePhase2(data);
  if (!("purchases" in data)) {
    (data as unknown as AhbDataV3).purchases = [];
  }
}

export function postPurchase(
  data: AhbDataV1,
  input: PostPurchaseInput
): Purchase {
  ensurePhase3(data);
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const prodIdx = data.products.findIndex((p) => p.id === input.productId);
  if (prodIdx === -1) throw new Error("Product not found");
  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0)
    throw new Error("Quantity must be > 0");

  const prod = data.products[prodIdx];
  if (!prod) throw new Error("Product not found");
  const purchase: Purchase = {
    id: genId(),
    date: date.toISOString(),
    productId: prod.id,
    unit: prod.unit,
    quantity: qty,
    notes: input.notes?.trim() || undefined,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  // persist purchase
  data.purchases.push(purchase);
  // increment stock
  data.products[prodIdx] = {
    ...prod,
    stock: (Number(prod.stock) || 0) + qty,
    updatedAt: nowIso(),
  };

  return purchase;
}

// -----------------------
// Phase 4: Reports (data aggregation)
// -----------------------

export type MoneyTxnCustomerRangeRow = {
  date: string; // DD-MM-YYYY
  customerId: number; // 0 indicates anonymous
  customerName?: string;
  netBill: number;
  paid: number;
  due: number; // max(0, netBill - paid)
  previousDue: number;
  totalDue: number; // previousDue + due (== invoice.currentDue)
};

export type MoneyTxnCustomerRange = {
  rows: MoneyTxnCustomerRangeRow[];
  totals: { netBill: number; paid: number; due: number };
};

export function reportMoneyTransactionsCustomerRange(
  data: AhbDataV1,
  from: string,
  to: string
): MoneyTxnCustomerRange {
  ensurePhase2(data);
  const start = from;
  const end = to;
  const nameByCustomer = new Map<number, string>(
    data.customers.map((c) => [c.id, c.nameBn])
  );

  const rows: MoneyTxnCustomerRangeRow[] = [];
  for (const inv of data.invoices) {
    const ymd = isoToYmd(inv.date);
    if (ymd < start || ymd > end) continue;
    const netBill = ceil2(inv.totals.net || 0);
    const paid = ceil2(inv.paid || 0);
    const due = Math.max(0, ceil2(netBill - paid));
    const previousDue = ceil2(inv.previousDue || 0);
    const totalDue = ceil2(previousDue + due); // equals inv.currentDue
    rows.push({
      date: toDDMMYYYY(ymd),
      customerId: inv.customerId ?? 0,
      customerName:
        inv.customerId != null ? nameByCustomer.get(inv.customerId) : undefined,
      netBill,
      paid,
      due,
      previousDue,
      totalDue,
    });
  }

  // Sort by date desc then customer asc for stability
  rows.sort((a, b) =>
    a.date < b.date
      ? 1
      : a.date > b.date
        ? -1
        : (a.customerId || 0) - (b.customerId || 0)
  );

  const totals = rows.reduce(
    (acc, r) => ({
      netBill: ceil2(acc.netBill + r.netBill),
      paid: ceil2(acc.paid + r.paid),
      due: ceil2(acc.due + r.due),
    }),
    { netBill: 0, paid: 0, due: 0 }
  );

  return { rows, totals };
}

export type MoneyTxnDayWiseRow = {
  customerId: number; // 0 indicates anonymous
  customerName?: string;
  bill: number; // sum of subtotals
  discount: number; // sum of discounts
  netBill: number; // sum of nets
  paid: number; // sum of paid
  due: number; // netBill - paid (ceil2, non-negative)
  previousDue: number; // from earliest invoice for this customer on the day
  totalDue: number; // previousDue + due
  hasInvoice: boolean; // false when the day holds only a standalone payment
};

export type MoneyTxnDay = {
  date: string; // DD-MM-YYYY
  rows: MoneyTxnDayWiseRow[];
  totals: {
    bill: number;
    discount: number;
    netBill: number;
    paid: number;
    due: number;
  };
};

export type MoneyTxnDayWise = {
  days: MoneyTxnDay[];
};

export function reportMoneyTransactionsDayWise(
  data: AhbDataV1,
  from: string,
  to: string
): MoneyTxnDayWise {
  ensurePhase2(data);
  const start = from;
  const end = to;
  const nameByCustomer = new Map<number, string>(
    data.customers.map((c) => [c.id, c.nameBn])
  );

  type Acc = {
    bill: number;
    discount: number;
    netBill: number;
    paid: number;
    due: number;
    earliestIso?: string;
    earliestPrevDue: number;
    hasInvoice: boolean;
  };

  const dayMap = new Map<string, Map<number, Acc>>(); // ymd -> customerId (0=anon) -> Acc

  // A payment-only accumulator carries no previous-due snapshot: a Payment
  // records nothing but the amount, and the customer's outstanding is today's
  // figure rather than that day's.
  function accFor(ymd: string, customerId: number): Acc {
    let custMap = dayMap.get(ymd);
    if (!custMap) {
      custMap = new Map();
      dayMap.set(ymd, custMap);
    }
    let acc = custMap.get(customerId);
    if (!acc) {
      acc = {
        bill: 0,
        discount: 0,
        netBill: 0,
        paid: 0,
        due: 0,
        earliestPrevDue: 0,
        hasInvoice: false,
      };
      custMap.set(customerId, acc);
    }
    return acc;
  }

  for (const inv of data.invoices ?? []) {
    const ymd = isoToYmd(inv.date);
    if (ymd < start || ymd > end) continue;
    const subtotal = ceil2(
      inv.totals?.subtotal ??
        inv.lines.reduce(
          (s, l) => s + (l.lineTotal || ceil2(l.quantity * l.rate)),
          0
        )
    );
    const discount = ceil2(inv.discount || 0);
    const net = ceil2(inv.totals?.net ?? Math.max(0, subtotal - discount));
    const paid = ceil2(inv.paid || 0);
    const due = Math.max(0, ceil2(net - paid));

    const acc = accFor(ymd, inv.customerId ?? 0);
    if (!acc.hasInvoice) {
      acc.hasInvoice = true;
      acc.earliestIso = inv.date;
      acc.earliestPrevDue = ceil2(inv.previousDue || 0);
    }
    acc.bill = ceil2(acc.bill + subtotal);
    acc.discount = ceil2(acc.discount + discount);
    acc.netBill = ceil2(acc.netBill + net);
    acc.paid = ceil2(acc.paid + paid);
    acc.due = ceil2(acc.due + due);
    if (acc.earliestIso && inv.date < acc.earliestIso) {
      acc.earliestIso = inv.date;
      acc.earliestPrevDue = ceil2(inv.previousDue || 0);
    }
  }

  // Deposits taken against an old due carry no invoice, so they would
  // otherwise be missing from the day's paid column entirely.
  for (const p of data.payments ?? []) {
    const ymd = isoToYmd(p.date);
    if (ymd < start || ymd > end) continue;
    const amount = ceil2(p.amount || 0);
    if (amount <= 0) continue;
    const acc = accFor(ymd, p.customerId);
    acc.paid = ceil2(acc.paid + amount);
  }

  const days: MoneyTxnDay[] = [];
  for (const [ymd, custMap] of dayMap) {
    const rows: MoneyTxnDayWiseRow[] = [];
    for (const [custId, acc] of custMap) {
      const previousDue = ceil2(acc.earliestPrevDue);
      const totalDue = ceil2(previousDue + acc.due);
      rows.push({
        customerId: custId,
        customerName: custId ? nameByCustomer.get(custId) : undefined,
        bill: acc.bill,
        discount: acc.discount,
        netBill: acc.netBill,
        paid: acc.paid,
        due: acc.due,
        previousDue,
        totalDue,
        hasInvoice: acc.hasInvoice,
      });
    }
    // Sort rows by customer name/id for consistency
    rows.sort((a, b) => {
      const an =
        a.customerName ?? (a.customerId ? String(a.customerId) : "Walk-in");
      const bn =
        b.customerName ?? (b.customerId ? String(b.customerId) : "Walk-in");
      return an.localeCompare(bn, "bn");
    });
    const totals = rows.reduce(
      (t, r) => ({
        bill: ceil2(t.bill + r.bill),
        discount: ceil2(t.discount + r.discount),
        netBill: ceil2(t.netBill + r.netBill),
        paid: ceil2(t.paid + r.paid),
        due: ceil2(t.due + r.due),
      }),
      { bill: 0, discount: 0, netBill: 0, paid: 0, due: 0 }
    );
    days.push({ date: toDDMMYYYY(ymd), rows, totals });
  }
  // Sort days by date desc (convert DD-MM-YYYY back for sort)
  days.sort((a, b) => {
    const [ad, am, ay] = a.date.split("-");
    const [bd, bm, by] = b.date.split("-");
    const as = `${ay}-${am}-${ad}`;
    const bs = `${by}-${bm}-${bd}`;
    return as < bs ? 1 : as > bs ? -1 : 0;
  });
  return { days };
}

// -----------------------
// Client ledger: every transaction in range, grouped by client
// -----------------------

export type ClientLedgerRow = {
  date: string; // DD-MM-YYYY
  bill: number; // subtotal
  discount: number;
  netBill: number;
  paid: number;
  previousDue: number; // snapshot from the invoice
  hasInvoice: boolean; // false for a standalone deposit
};

export type ClientLedgerClient = {
  customerId: number; // 0 indicates anonymous
  customerName?: string;
  /** The customer's outstanding today, not as of the end of the range. */
  currentDue: number;
  rows: ClientLedgerRow[];
};

export type ClientLedgerReport = { clients: ClientLedgerClient[] };

export function reportClientLedger(
  data: AhbDataV1,
  from: string,
  to: string,
  customerId?: number
): ClientLedgerReport {
  ensurePhase2(data);
  const customerById = new Map(data.customers.map((c) => [c.id, c]));
  const wanted = (id: number) => customerId === undefined || id === customerId;

  // customerId (0 = anonymous) -> rows
  const byCustomer = new Map<number, ClientLedgerRow[]>();
  const rowsFor = (id: number) => {
    let rows = byCustomer.get(id);
    if (!rows) {
      rows = [];
      byCustomer.set(id, rows);
    }
    return rows;
  };

  for (const inv of data.invoices ?? []) {
    const ymd = isoToYmd(inv.date);
    if (ymd < from || ymd > to) continue;
    const id = inv.customerId ?? 0;
    if (!wanted(id)) continue;
    const bill = ceil2(
      inv.totals?.subtotal ??
        inv.lines.reduce(
          (s, l) => s + (l.lineTotal || ceil2(l.quantity * l.rate)),
          0
        )
    );
    const discount = ceil2(inv.discount || 0);
    rowsFor(id).push({
      date: toDDMMYYYY(ymd),
      bill,
      discount,
      netBill: ceil2(inv.totals?.net ?? Math.max(0, bill - discount)),
      paid: ceil2(inv.paid || 0),
      previousDue: ceil2(inv.previousDue || 0),
      hasInvoice: true,
    });
  }

  // A deposit against an old due has no invoice behind it, and no previous-due
  // snapshot to report either.
  for (const p of data.payments ?? []) {
    const ymd = isoToYmd(p.date);
    if (ymd < from || ymd > to) continue;
    if (!wanted(p.customerId)) continue;
    const amount = ceil2(p.amount || 0);
    if (amount <= 0) continue;
    rowsFor(p.customerId).push({
      date: toDDMMYYYY(ymd),
      bill: 0,
      discount: 0,
      netBill: 0,
      paid: amount,
      previousDue: 0,
      hasInvoice: false,
    });
  }

  const clients: ClientLedgerClient[] = [];
  for (const [id, rows] of byCustomer) {
    // A ledger reads forwards
    rows.sort((a, b) => ymdOf(a.date).localeCompare(ymdOf(b.date)));
    clients.push({
      customerId: id,
      customerName: customerById.get(id)?.nameBn,
      currentDue: ceil2(customerById.get(id)?.outstanding ?? 0),
      rows,
    });
  }
  clients.sort((a, b) => a.customerId - b.customerId);
  return { clients };
}

// -----------------------
// Phase 4: Daily Payment Report
// -----------------------

export type DailyPaymentRow = {
  customerId: number; // 0 indicates anonymous
  customerName?: string;
  paid: number;
};

export type DailyPaymentReport = {
  header: { date: string }; // DD-MM-YYYY
  rows: DailyPaymentRow[];
  totals: { paid: number };
};

export function reportDailyPayments(
  data: AhbDataV1,
  date: string
): DailyPaymentReport {
  ensurePhase2(data);
  const target = date; // YYYY-MM-DD
  const nameByCustomer = new Map<number, string>(
    data.customers.map((c) => [c.id, c.nameBn])
  );

  const rows: DailyPaymentRow[] = [];
  for (const inv of data.invoices ?? []) {
    const ymd = isoToYmd(inv.date);
    if (ymd !== target) continue;
    const paid = ceil2(inv.paid || 0);
    if (paid <= 0) continue; // omit zero payments
    rows.push({
      customerId: inv.customerId ?? 0,
      customerName:
        inv.customerId != null ? nameByCustomer.get(inv.customerId) : undefined,
      paid,
    });
  }

  for (const p of data.payments ?? []) {
    const ymd = isoToYmd(p.date);
    if (ymd !== target) continue;
    const paid = ceil2(p.amount || 0);
    if (paid <= 0) continue;
    rows.push({
      customerId: p.customerId,
      customerName: nameByCustomer.get(p.customerId),
      paid,
    });
  }

  // Sort rows by customer for stable display
  rows.sort((a, b) => {
    const an = a.customerName ?? String(a.customerId);
    const bn = b.customerName ?? String(b.customerId);
    return an.localeCompare(bn, "bn");
  });

  const totals = rows.reduce((t, r) => ({ paid: ceil2(t.paid + r.paid) }), {
    paid: 0,
  });

  return { header: { date: toDDMMYYYY(target) }, rows, totals };
}

// -----------------------
// Total sell: quantity sold per item, per day
// -----------------------

export type TotalSellItemRow = {
  productId: number;
  productNameBn?: string;
  unit?: string;
  quantity: number;
};

export type TotalSellDay = {
  date: string; // DD-MM-YYYY
  rows: TotalSellItemRow[];
};

export type TotalSellReport = { days: TotalSellDay[] };

export function reportTotalSell(
  data: AhbDataV1,
  from: string,
  to: string
): TotalSellReport {
  ensurePhase2(data);
  const productById = new Map(data.products.map((p) => [p.id, p]));

  // ymd -> productId -> quantity
  const dayMap = new Map<string, Map<number, number>>();
  for (const inv of data.invoices ?? []) {
    const ymd = isoToYmd(inv.date);
    if (ymd < from || ymd > to) continue;
    let byProduct = dayMap.get(ymd);
    if (!byProduct) {
      byProduct = new Map();
      dayMap.set(ymd, byProduct);
    }
    for (const ln of inv.lines) {
      const qty = Number(ln.quantity) || 0;
      // An item that moved nothing has no place in a sales report
      if (qty <= 0) continue;
      byProduct.set(ln.productId, ceil2((byProduct.get(ln.productId) ?? 0) + qty));
    }
  }

  const days: TotalSellDay[] = [];
  // Oldest first: the report reads forwards through the range
  for (const ymd of Array.from(dayMap.keys()).sort()) {
    const byProduct = dayMap.get(ymd)!;
    const rows: TotalSellItemRow[] = Array.from(byProduct.entries())
      .map(([productId, quantity]) => ({
        productId,
        productNameBn: productById.get(productId)?.nameBn,
        unit: productById.get(productId)?.unit,
        quantity,
      }))
      .sort((a, b) => a.productId - b.productId);
    days.push({ date: toDDMMYYYY(ymd), rows });
  }
  return { days };
}
