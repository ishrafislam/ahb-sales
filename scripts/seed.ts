/*
  Seed script: generates an encrypted .ahbs file with random data.
  - Loads AHB_KEY_HEX from .env
  - Creates products, customers
  - Simulates N days of purchases (stock in) and sales (invoices)
  - Saves to an .ahbs file compatible with the application

  Usage (Bun):
    bun run scripts/seed.ts --out seed.ahbs --days 14 --products 50 --customers 30
    # Optional: choose output directory
    bun run scripts/seed.ts --dir ./tmp-seeds --out seed.ahbs

  Defaults:
    --dir: seeds
    --out: seed-YYYYMMDD.ahbs
    --days: 14
    --products: 40
    --customers: 25
*/
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

import {
  createEmptyDocument,
  encryptJSON,
  type AhbDocument,
} from "../src/main/crypto";
import {
  initData,
  addProduct,
  addCustomer,
  postPurchase,
  postInvoice,
  type AhbDataV1,
} from "../src/main/data";

function ceil2(n: number): number {
  return Math.ceil(n * 100) / 100;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]!;
}

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (current && current.startsWith("--")) {
      const key = current.slice(2);
      const next = argv[i + 1];
      const val = next && !next.startsWith("--") ? argv[++i] : "true";
      args[key] = val ?? "";
    }
  }
  return args;
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const days = Number(args.days ?? 14);
  const productCount = Number(args.products ?? 40);
  const customerCount = Number(args.customers ?? 25);
  const outFile = (() => {
    const def = `seed-${fmtDate(new Date())}.ahbs`;
    const p = args.out ?? def;
    return p.endsWith(".ahbs") ? p : `${p}.ahbs`;
  })();
  const outDir = args.dir ?? "seeds";

  if (!process.env.AHB_KEY_HEX || process.env.AHB_KEY_HEX.length !== 64) {
    console.error(
      "AHB_KEY_HEX must be set in your environment (64 hex chars)."
    );
    process.exit(1);
  }

  // Create base document and data store
  const doc: AhbDocument = createEmptyDocument();
  const data: AhbDataV1 = initData();

  // Create Products (IDs from 1..1000, we take the first N sequentially)
  const units = ["kg", "ltr", "pc", "bag"];
  const productIds: number[] = [];
  for (let i = 0; i < productCount; i++) {
    const id = i + 1; // simple sequential selection
    productIds.push(id);
    addProduct(data, {
      id,
      nameBn: `পণ্য ${id}`,
      unit: choice(units),
      price: randInt(10, 500),
      stock: randInt(0, 30),
      active: true,
      description: "",
    });
  }

  // Create Customers
  const customerIds: number[] = [];
  for (let i = 0; i < customerCount; i++) {
    const id = i + 1;
    customerIds.push(id);
    addCustomer(data, {
      id,
      nameBn: `ক্রেতা ${id}`,
      address: "",
      active: true,
      outstanding: 0,
    });
  }

  // Generate a date list: last N days, inclusive of today
  const dayDates: Date[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    dayDates.push(d);
  }

  // Per-day simulation
  for (const d of dayDates) {
    // Random purchases per day (stock in)
    const purchaseCount = randInt(3, 8);
    for (let i = 0; i < purchaseCount; i++) {
      const pid = choice(productIds);
      const qty = randInt(3, 30);
      const date = new Date(d);
      date.setHours(randInt(9, 18), randInt(0, 59), randInt(0, 59), 0);
      try {
        await Promise.resolve(
          postPurchase(data, {
            productId: pid,
            quantity: qty,
            date: date.toISOString(),
          })
        );
      } catch (e) {
        // Ignore individual purchase failures; continue
        // eslint-disable-next-line no-console
        console.warn("purchase failed", (e as Error).message);
      }
    }

    // Random invoices per day (sales)
    const invoiceCount = randInt(6, 16);
    for (let k = 0; k < invoiceCount; k++) {
      const customerId = choice(customerIds);
      // Build unique product lines (1..4 lines)
      const lines: { productId: number; quantity: number }[] = [];
      const chosen = new Set<number>();
      const lineTarget = randInt(1, 4);
      // Build lines from products that currently have stock
      for (let tries = 0; tries < 20 && lines.length < lineTarget; tries++) {
        const pid = choice(productIds);
        if (chosen.has(pid)) continue;
        const prod = data.products.find((p) => p.id === pid);
        if (!prod || prod.stock <= 0) continue;
        const qty = Math.min(prod.stock, randInt(1, 5));
        if (qty <= 0) continue;
        chosen.add(pid);
        lines.push({ productId: pid, quantity: qty });
      }
      if (lines.length === 0) continue; // skip if nothing in stock

      // Discount and paid - keep within bounds to avoid validation failures
      // Compute a rough subtotal to pick a small discount
      let approxSubtotal = 0;
      for (const ln of lines) {
        const prod = data.products.find((p) => p.id === ln.productId)!;
        approxSubtotal += ceil2(ln.quantity * (prod.price || 0));
      }
      const discount =
        Math.random() < 0.5 ? ceil2(approxSubtotal * Math.random() * 0.1) : 0;
      // Determine previous due
      const cust = data.customers.find((c) => c.id === customerId)!;
      const previousDue = ceil2(Number(cust.outstanding || 0));
      const net = ceil2(approxSubtotal - discount);
      const maxPayable = Math.max(0, ceil2(previousDue + net));
      const paid = randInt(0, Math.floor(maxPayable));

      const date = new Date(d);
      date.setHours(randInt(9, 20), randInt(0, 59), randInt(0, 59), 0);
      try {
        postInvoice(data, {
          date: date.toISOString(),
          customerId,
          lines,
          discount,
          paid,
          notes:
            Math.random() < 0.15 ? "Auto-generated seed invoice" : undefined,
        });
      } catch (e) {
        // Ignore individual invoice failures; continue
        // eslint-disable-next-line no-console
        console.warn("invoice failed", (e as Error).message);
      }
    }
  }

  // Finalize document and write
  doc.data = data;
  doc.meta.updatedAt = new Date().toISOString();
  const buf = encryptJSON(doc);
  const baseDir = path.isAbsolute(outDir)
    ? outDir
    : path.join(process.cwd(), outDir);
  fs.mkdirSync(baseDir, { recursive: true });
  const outAbs = path.isAbsolute(outFile)
    ? outFile
    : path.join(baseDir, outFile);
  fs.writeFileSync(outAbs, buf);

  // eslint-disable-next-line no-console
  console.log(`Seed written: ${outAbs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
