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
};

export function initData(): AhbDataV1 {
  return { products: [], customers: [] };
}

// Helpers
const nowIso = () => new Date().toISOString();

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
