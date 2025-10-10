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
  return { products: [], customers: [], invoices: [], invoiceSeq: 1 };
}

// Helpers
const nowIso = () => new Date().toISOString();
const ceil2 = (n: number) => Math.ceil(n * 100) / 100;
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
  customerId: number;
  lines: InvoiceLine[];
  discount: number;
  notes?: string;
  totals: { subtotal: number; net: number };
  status: "posted"; // Phase 2: only posted receipts
  createdAt: string;
  updatedAt: string;
};

export type PostInvoiceInput = {
  date?: string;
  customerId: number;
  lines: Array<{
    productId: number;
    quantity: number;
    rate?: number;
    description?: string;
  }>;
  discount?: number;
  notes?: string;
};

export function postInvoice(data: AhbDataV1, input: PostInvoiceInput): Invoice {
  ensurePhase2(data);
  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");
  const customer = data.customers.find((c) => c.id === input.customerId);
  if (!customer) throw new Error("Customer not found");
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

  // Stock check
  for (const l of lines) {
    const prod = data.products.find((p) => p.id === l.productId)!;
    if (prod.stock < l.quantity) {
      throw new Error(
        `Insufficient stock for product ${prod.id} (${prod.nameBn}). Available: ${prod.stock}, required: ${l.quantity}`
      );
    }
  }

  // Assign invoice no and id
  const invoiceNo = data.invoiceSeq++;
  const inv: Invoice = {
    id: genId(),
    no: invoiceNo,
    date: date.toISOString(),
    customerId: customer.id,
    lines,
    discount,
    notes: input.notes?.trim() || undefined,
    totals: { subtotal, net },
    status: "posted",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  // Persist and update stock
  data.invoices.push(inv);
  for (const l of lines) {
    const idx = data.products.findIndex((p) => p.id === l.productId);
    const prod = data.products[idx];
    data.products[idx] = {
      ...prod,
      stock: prod.stock - l.quantity,
      updatedAt: nowIso(),
    };
  }

  return inv;
}

export function assertProductId(id: number) {
  if (!Number.isInteger(id) || id < 1 || id > 1000) {
    throw new Error("Product ID must be an integer between 1 and 1000");
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
  const next: Product = {
    ...old,
    ...patch,
    nameBn: patch.nameBn !== undefined ? patch.nameBn : old.nameBn,
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
  if (!c.nameBn?.trim()) throw new Error("Customer Bengali name is required");
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
    nameBn: c.nameBn.trim(),
    nameEn: c.nameEn?.trim() || undefined,
    address: c.address?.trim() || undefined,
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
  const next: Customer = { ...old, ...patch, updatedAt: nowIso() };
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
