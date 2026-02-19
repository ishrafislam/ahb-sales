import { MIN_PRODUCT_ID, MAX_PRODUCT_ID } from "../constants/business";
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
};

export function initData(): AhbDataV1 {
  return {
    products: [],
    customers: [],
    invoices: [],
    invoiceSeq: 1,
  };
}

// Helpers
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const isoToYmd = (iso: string) => iso.slice(0, 10); // YYYY-MM-DD (UTC slice)

// Ensure Phase 2 fields exist on data object for older files
export type AhbDataV2 = Required<Pick<AhbDataV1, "invoices" | "invoiceSeq">> &
  Pick<AhbDataV1, "products" | "customers">;

export function ensurePhase2(data: AhbDataV1): asserts data is AhbDataV2 {
  if (!data.invoices) {
    (data as AhbDataV1 & { invoices: Invoice[] }).invoices = [];
  }
  if (typeof data.invoiceSeq !== "number") {
    (data as AhbDataV1 & { invoiceSeq: number }).invoiceSeq = 1;
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
  previousDue: number; // customer's outstanding before posting this invoice
  currentDue: number; // customer's outstanding after posting this invoice
  status: "posted"; // Phase 2: only posted receipts
  createdAt: string;
  updatedAt: string;
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
};

export function postInvoice(data: AhbDataV1, input: PostInvoiceInput): Invoice {
  ensurePhase2(data);
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const hasCustomer =
    input.customerId !== null && input.customerId !== undefined;
  const customer = hasCustomer
    ? data.customers.find((c) => c.id === (input.customerId as number))
    : undefined;
  if (hasCustomer && !customer) throw new Error("Customer not found");
  if (!Array.isArray(input.lines) || input.lines.length === 0)
    throw new Error("At least one line item is required");

  // Build lines with defaults and validation
  const lines: InvoiceLine[] = input.lines.map((ln, idx) => {
    const prod = data.products.find((p) => p.id === ln.productId);
    if (!prod) throw new Error(`Product not found: ${ln.productId}`);
    const qty = Number(ln.quantity);
    if (!Number.isFinite(qty) || qty <= 0)
      throw new Error("Quantity must be > 0");
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
  const previousDue = hasCustomer
    ? ceil2(Number(customer!.outstanding || 0))
    : 0;
  const paid = Number(input.paid ?? 0);
  if (!Number.isFinite(paid) || paid < 0)
    throw new Error("Paid must be a non-negative number");
  const maxPayable = ceil2(previousDue + net);
  if (paid > maxPayable)
    throw new Error("Paid amount cannot exceed previous due plus net bill");
  const invoiceDue = Math.max(0, ceil2(net - paid));
  const currentDue = hasCustomer ? ceil2(previousDue + invoiceDue) : 0;

  // Stock check removed: allow negative stock (policy change)

  // Assign invoice no and id
  const invoiceNo = data.invoiceSeq++;
  const inv: Invoice = {
    id: genId(),
    no: invoiceNo,
    date: date.toISOString(),
    customerId: hasCustomer ? customer!.id : null,
    lines,
    discount,
    notes: input.notes?.trim() || undefined,
    totals: { subtotal, net },
    paid,
    previousDue,
    currentDue,
    status: "posted",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  // Persist and update stock
  data.invoices.push(inv);
  for (const l of lines) {
    const idx = data.products.findIndex((p) => p.id === l.productId);
    if (idx === -1) continue; // Should not happen as validated earlier
    const prod = data.products[idx];
    if (!prod) continue; // Additional safety check
    const updated: Product = {
      id: prod.id,
      nameBn: prod.nameBn,
      nameEn: prod.nameEn,
      description: prod.description,
      unit: prod.unit,
      price: prod.price,
      stock: prod.stock - l.quantity,
      active: prod.active,
      createdAt: prod.createdAt,
      updatedAt: nowIso(),
    };
    data.products[idx] = updated;
  }
  // Update customer outstanding (currentDue)
  if (hasCustomer && customer) {
    const custIdx = data.customers.findIndex((c) => c.id === customer.id);
    if (custIdx !== -1) {
      data.customers[custIdx] = {
        ...customer,
        outstanding: currentDue,
        updatedAt: nowIso(),
      };
    }
  }

  return inv;
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
  amount: number
): void {
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
    earliestIso: string;
    earliestPrevDue: number;
  };

  const dayMap = new Map<string, Map<number, Acc>>(); // ymd -> customerId (0=anon) -> Acc
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

    let custMap = dayMap.get(ymd);
    if (!custMap) {
      custMap = new Map();
      dayMap.set(ymd, custMap);
    }
    const cid = inv.customerId ?? 0;
    let acc = custMap.get(cid);
    if (!acc) {
      acc = {
        bill: 0,
        discount: 0,
        netBill: 0,
        paid: 0,
        due: 0,
        earliestIso: inv.date,
        earliestPrevDue: ceil2(inv.previousDue || 0),
      };
      custMap.set(cid, acc);
    }
    acc.bill = ceil2(acc.bill + subtotal);
    acc.discount = ceil2(acc.discount + discount);
    acc.netBill = ceil2(acc.netBill + net);
    acc.paid = ceil2(acc.paid + paid);
    acc.due = ceil2(acc.due + due);
    if (inv.date < acc.earliestIso) {
      acc.earliestIso = inv.date;
      acc.earliestPrevDue = ceil2(inv.previousDue || 0);
    }
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
