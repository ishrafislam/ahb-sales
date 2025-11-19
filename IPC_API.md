# IPC API Documentation

This document describes all IPC (Inter-Process Communication) channels between the Electron main process and renderer process in the AHB Sales application.

## Table of Contents

- [File Operations](#file-operations)
- [Language & Localization](#language--localization)
- [Data Operations](#data-operations)
  - [Products](#products)
  - [Customers](#customers)
  - [Invoices](#invoices)
  - [Purchases](#purchases)
- [Reports](#reports)
- [Settings](#settings)
- [Application Control](#application-control)
- [Updates](#updates)
- [Theme](#theme)
- [Events](#events)

---

## File Operations

### `app:new-file`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<void>`  
**Description:** Creates a new encrypted `.ahbs` file with empty data structure. Prompts user for save location.

**Usage:**
```typescript
await window.ahb.newFile();
```

---

### `app:open-file`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<void>`  
**Description:** Opens a file picker dialog to select and decrypt an existing `.ahbs` file.

**Usage:**
```typescript
await window.ahb.openFile();
```

---

### `app:save-file`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<void>`  
**Description:** Saves the current document to its existing path. Does nothing if no file is open.

**Usage:**
```typescript
await window.ahb.saveFile();
```

---

### `app:save-file-as`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<void>`  
**Description:** Saves the current document to a new location chosen via file picker dialog.

**Usage:**
```typescript
await window.ahb.saveFileAs();
```

---

### `app:get-file-info`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<{ path: string | null; isDirty: boolean }>`  
**Description:** Returns information about the currently open file.

**Response:**
- `path`: Full file path or `null` if no file is open
- `isDirty`: Whether the document has unsaved changes

**Usage:**
```typescript
const info = await window.ahb.getFileInfo();
console.log(info.path); // "/Users/example/data.ahbs"
console.log(info.isDirty); // true
```

---

## Language & Localization

### `app:get-language`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<"bn" | "en">`  
**Description:** Returns the current UI language setting.

**Usage:**
```typescript
const lang = await window.ahb.getLanguage(); // "bn" or "en"
```

---

### `app:set-language`
**Type:** `handle` (invoke/response)  
**Parameters:** `lang: "bn" | "en"`  
**Returns:** `Promise<void>`  
**Description:** Changes the UI language and persists to settings.

**Usage:**
```typescript
await window.ahb.setLanguage("en");
```

---

## Data Operations

### Products

#### `data:list-products`
**Type:** `handle` (invoke/response)  
**Parameters:** `opts?: boolean | { activeOnly?: boolean }`  
**Returns:** `Promise<Product[]>`  
**Description:** Lists all products. Can filter to active products only.

**Product Type:**
```typescript
type Product = {
  id: number;          // 1-99999
  nameBn: string;
  nameEn?: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
};
```

**Usage:**
```typescript
// List all products
const allProducts = await window.ahb.listProducts();

// List only active products
const activeProducts = await window.ahb.listProducts({ activeOnly: true });
// or
const activeProducts = await window.ahb.listProducts(true);
```

---

#### `data:add-product`
**Type:** `handle` (invoke/response)  
**Parameters:** `product: Partial<Product>`  
**Returns:** `Promise<Product>`  
**Description:** Adds a new product. Auto-assigns ID, timestamps, and defaults.

**Required Fields:**
- `nameBn`: string
- `unit`: string
- `price`: number

**Optional Fields:**
- `nameEn`: string
- `stock`: number (default: 0)
- `active`: boolean (default: true)

**Usage:**
```typescript
const product = await window.ahb.addProduct({
  nameBn: "চিনি",
  nameEn: "Sugar",
  unit: "kg",
  price: 100,
  stock: 50
});
```

---

#### `data:update-product`
**Type:** `handle` (invoke/response)  
**Parameters:** `id: number, patch: Partial<Product>`  
**Returns:** `Promise<Product>`  
**Description:** Updates an existing product. Only provided fields are changed.

**Usage:**
```typescript
const updated = await window.ahb.updateProduct(1, {
  price: 120,
  stock: 45
});
```

---

### Customers

#### `data:list-customers`
**Type:** `handle` (invoke/response)  
**Parameters:** `opts?: boolean | { activeOnly?: boolean }`  
**Returns:** `Promise<Customer[]>`  
**Description:** Lists all customers. Can filter to active customers only.

**Customer Type:**
```typescript
type Customer = {
  id: number;          // 1-99999
  nameBn: string;
  nameEn?: string;
  addressBn?: string;
  addressEn?: string;
  phone?: string;
  active: boolean;
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
};
```

**Usage:**
```typescript
const allCustomers = await window.ahb.listCustomers();
const activeCustomers = await window.ahb.listCustomers(true);
```

---

#### `data:add-customer`
**Type:** `handle` (invoke/response)  
**Parameters:** `customer: Partial<Customer>`  
**Returns:** `Promise<Customer>`  
**Description:** Adds a new customer. Auto-assigns ID, timestamps, and defaults.

**Required Fields:**
- `nameBn`: string

**Usage:**
```typescript
const customer = await window.ahb.addCustomer({
  nameBn: "রহিম",
  phone: "01712345678",
  addressBn: "ঢাকা"
});
```

---

#### `data:update-customer`
**Type:** `handle` (invoke/response)  
**Parameters:** `id: number, patch: Partial<Customer>`  
**Returns:** `Promise<Customer>`  
**Description:** Updates an existing customer. Only provided fields are changed.

**Usage:**
```typescript
const updated = await window.ahb.updateCustomer(101, {
  phone: "01798765432",
  active: false
});
```

---

### Invoices

#### `data:post-invoice`
**Type:** `handle` (invoke/response)  
**Parameters:** `payload: PostInvoiceInput`  
**Returns:** `Promise<Invoice>`  
**Description:** Posts a new sales invoice. Updates product stock and customer account receivable.

**PostInvoiceInput Type:**
```typescript
type PostInvoiceInput = {
  customerId: number;    // Use 0 for anonymous/walk-in
  date: string;          // ISO 8601 date
  lines: Array<{
    productId: number;
    quantity: number;    // Can be negative for returns
    rate?: number;       // Overrides product price if provided
  }>;
  discount?: number;     // Default: 0
  paid?: number;         // Amount paid (default: 0)
  notes?: string;
};
```

**Invoice Type:**
```typescript
type Invoice = {
  id: string;
  no: number;            // Sequential invoice number
  customerId: number;
  date: string;          // ISO 8601
  lines: Array<{
    sn: number;          // Serial number (1-based)
    productId: number;
    unit: string;
    quantity: number;
    rate: number;
    lineTotal: number;
  }>;
  discount: number;
  totals: {
    subtotal: number;
    net: number;
  };
  paid: number;
  previousDue: number;
  currentDue: number;
  notes?: string;
  status: "posted";
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
};
```

**Business Rules:**
- Anonymous invoices (customerId=0) must be fully paid (`paid >= net`)
- Discount cannot exceed subtotal
- Stock is decremented by quantity (can go negative)
- Line totals use ceil-to-2 rounding
- Invoice numbers increment sequentially

**Usage:**
```typescript
const invoice = await window.ahb.postInvoice({
  customerId: 101,
  date: "2025-11-19",
  lines: [
    { productId: 1, quantity: 10 },
    { productId: 2, quantity: 5, rate: 150 } // Custom rate
  ],
  discount: 50,
  paid: 1000,
  notes: "Delivery by Friday"
});
```

---

#### `data:list-invoices-by-customer`
**Type:** `handle` (invoke/response)  
**Parameters:** `customerId: number`  
**Returns:** `Promise<Invoice[]>`  
**Description:** Lists all invoices for a specific customer, sorted by date (newest first).

**Usage:**
```typescript
const invoices = await window.ahb.listInvoicesByCustomer(101);
```

---

#### `data:list-product-sales`
**Type:** `handle` (invoke/response)  
**Parameters:** `productId: number`  
**Returns:** `Promise<ProductSaleLine[]>`  
**Description:** Lists all sales lines for a specific product across all invoices.

**ProductSaleLine Type:**
```typescript
type ProductSaleLine = {
  date: string;          // ISO 8601
  invoiceNo: number;
  customerId: number;
  customerName: string;  // Bengali name
  quantity: number;
  rate: number;
  amount: number;
};
```

**Usage:**
```typescript
const sales = await window.ahb.listProductSales(1);
```

---

### Purchases

#### `data:post-purchase`
**Type:** `handle` (invoke/response)  
**Parameters:** `payload: PostPurchaseInput`  
**Returns:** `Promise<Purchase>`  
**Description:** Posts a product purchase entry. Increments product stock.

**PostPurchaseInput Type:**
```typescript
type PostPurchaseInput = {
  productId: number;
  quantity: number;      // Must be > 0
  date: string;          // ISO 8601 date
  notes?: string;
};
```

**Purchase Type:**
```typescript
type Purchase = {
  id: string;
  productId: number;
  quantity: number;
  date: string;          // ISO 8601
  notes?: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
};
```

**Usage:**
```typescript
const purchase = await window.ahb.postPurchase({
  productId: 1,
  quantity: 100,
  date: "2025-11-19",
  notes: "Supplier: ABC Ltd"
});
```

---

#### `data:list-product-purchases`
**Type:** `handle` (invoke/response)  
**Parameters:** `productId: number`  
**Returns:** `Promise<ProductPurchaseLine[]>`  
**Description:** Lists all purchase entries for a specific product.

**ProductPurchaseLine Type:**
```typescript
type ProductPurchaseLine = {
  date: string;          // ISO 8601
  quantity: number;
  notes?: string;
};
```

**Usage:**
```typescript
const purchases = await window.ahb.listProductPurchases(1);
```

---

## Reports

### `report:money-customer-range`
**Type:** `handle` (invoke/response)  
**Parameters:** `from: string, to: string` (ISO 8601 dates)  
**Returns:** `Promise<MoneyTxnCustomerRange>`  
**Description:** Generates customer-wise money transaction report for date range.

**MoneyTxnCustomerRange Type:**
```typescript
type MoneyTxnCustomerRange = {
  rows: Array<{
    customerId: number;
    customerName: string;  // Bengali name
    invoiceNo: number;
    date: string;          // DD-MM-YYYY format
    subtotal: number;
    discount: number;
    net: number;
    paid: number;
    due: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    net: number;
    paid: number;
    due: number;
  };
};
```

**Usage:**
```typescript
const report = await window.ahb.reportMoneyTransactionsCustomerRange(
  "2025-01-01",
  "2025-12-31"
);
```

---

### `report:money-daywise`
**Type:** `handle` (invoke/response)  
**Parameters:** `from: string, to: string` (ISO 8601 dates)  
**Returns:** `Promise<MoneyTxnDayWise>`  
**Description:** Generates day-wise money transaction report grouped by date and customer.

**MoneyTxnDayWise Type:**
```typescript
type MoneyTxnDayWise = {
  rows: Array<{
    date: string;          // DD-MM-YYYY format
    customerId: number;
    customerName: string;  // Bengali name
    subtotal: number;
    discount: number;
    net: number;
    paid: number;
    due: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    net: number;
    paid: number;
    due: number;
  };
};
```

**Usage:**
```typescript
const report = await window.ahb.reportMoneyTransactionsDayWise(
  "2025-01-01",
  "2025-01-31"
);
```

---

### `report:daily-payment`
**Type:** `handle` (invoke/response)  
**Parameters:** `date: string` (ISO 8601 date)  
**Returns:** `Promise<DailyPaymentReport>`  
**Description:** Lists all payments received on a specific date.

**DailyPaymentReport Type:**
```typescript
type DailyPaymentReport = {
  header: string;        // DD-MM-YYYY format
  rows: Array<{
    customerId: number;
    customerName: string;  // Bengali name
    invoiceNo: number;
    paid: number;
  }>;
  total: number;
};
```

**Usage:**
```typescript
const report = await window.ahb.reportDailyPayments("2025-11-19");
```

---

## Settings

### `settings:get-print`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<PrintSettings>`  
**Description:** Returns current print settings.

**PrintSettings Type:**
```typescript
type PrintSettings = {
  paperSize: "A4" | "A5" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: number;
  printerDevice?: string;
};
```

**Usage:**
```typescript
const settings = await window.ahb.getPrintSettings();
```

---

### `settings:set-print`
**Type:** `handle` (invoke/response)  
**Parameters:** `settings: Partial<PrintSettings>`  
**Returns:** `Promise<PrintSettings>`  
**Description:** Updates print settings. Returns updated settings.

**Usage:**
```typescript
const updated = await window.ahb.setPrintSettings({
  paperSize: "A5",
  marginMm: 10
});
```

---

### `settings:get-theme`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<{ source: string; effective: string }>`  
**Description:** Returns current theme settings.

**Theme Type:**
- `source`: "system" | "light" | "dark" (user preference)
- `effective`: "light" | "dark" (actual theme applied)

**Usage:**
```typescript
const theme = await window.ahb.getTheme();
console.log(theme.source);     // "system"
console.log(theme.effective);  // "dark"
```

---

### `settings:set-theme`
**Type:** `handle` (invoke/response)  
**Parameters:** `source: "system" | "light" | "dark"`  
**Returns:** `Promise<{ source: string; effective: string }>`  
**Description:** Changes theme preference. Returns updated theme info.

**Usage:**
```typescript
const theme = await window.ahb.setTheme("dark");
```

---

## Application Control

### `app:get-version`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<string>`  
**Description:** Returns application version from package.json.

**Usage:**
```typescript
const version = await window.ahb.getAppVersion(); // "1.0.5"
```

---

### `app:get-name`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<string>`  
**Description:** Returns application name.

**Usage:**
```typescript
const name = await window.ahb.getAppName(); // "Abdul Hamid & Brothers - Sales"
```

---

### `app:get-runtime-info`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<RuntimeInfo>`  
**Description:** Returns runtime environment information.

**RuntimeInfo Type:**
```typescript
type RuntimeInfo = {
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
  buildDate?: string;
  commitSha?: string;
};
```

**Usage:**
```typescript
const info = await window.ahb.getRuntimeInfo();
console.log(info.versions.electron); // "38.2.1"
```

---

## Updates

### `app:check-for-updates`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<boolean>`  
**Description:** Manually triggers update check. Returns true if check was initiated.

**Usage:**
```typescript
const checking = await window.ahb.checkForUpdates();
```

---

### `app:restart-and-install`
**Type:** `handle` (invoke/response)  
**Parameters:** None  
**Returns:** `Promise<boolean>`  
**Description:** Restarts the application to install a downloaded update.

**Usage:**
```typescript
await window.ahb.restartAndInstall();
```

---

## Events

Events are one-way notifications from main process to renderer. They use the `on` pattern with cleanup function.

### `app:file-info`
**Type:** `event` (one-way)  
**Payload:** `{ path: string | null; isDirty: boolean }`  
**Description:** Emitted when file info changes (after save, open, etc).

**Usage:**
```typescript
const cleanup = window.ahb.onFileInfo((info) => {
  console.log("File:", info.path, "Dirty:", info.isDirty);
});

// Later: cleanup when component unmounts
cleanup();
```

---

### `app:language-changed`
**Type:** `event` (one-way)  
**Payload:** `"bn" | "en"`  
**Description:** Emitted when UI language changes.

**Usage:**
```typescript
const cleanup = window.ahb.onLanguageChanged((lang) => {
  console.log("Language changed to:", lang);
});
```

---

### `app:document-changed`
**Type:** `event` (one-way)  
**Payload:** None  
**Description:** Emitted when document is loaded (after new/open file).

**Usage:**
```typescript
const cleanup = window.ahb.onDocumentChanged(() => {
  console.log("Document loaded");
});
```

---

### `data:changed`
**Type:** `event` (one-way)  
**Payload:** `{ kind: "product" | "customer"; action: string; id: number }`  
**Description:** Emitted when products or customers are added/updated.

**Actions:**
- `"added"`: New item created
- `"updated"`: Item modified

**Usage:**
```typescript
const cleanup = window.ahb.onDataChanged((payload) => {
  console.log(`${payload.kind} ${payload.action}:`, payload.id);
  // Refresh lists, etc.
});
```

---

### `app:open-settings`
**Type:** `event` (one-way)  
**Payload:** None  
**Description:** Emitted when user selects "Settings" from app menu.

**Usage:**
```typescript
const cleanup = window.ahb.onOpenSettings(() => {
  // Show settings modal
});
```

---

### `app:open-about`
**Type:** `event` (one-way)  
**Payload:** None  
**Description:** Emitted when user selects "About" from app menu.

**Usage:**
```typescript
const cleanup = window.ahb.onOpenAbout(() => {
  // Show about modal
});
```

---

### `app:theme-changed`
**Type:** `event` (one-way)  
**Payload:** `{ source: string; effective: string }`  
**Description:** Emitted when theme changes (user preference or system).

**Usage:**
```typescript
const cleanup = window.ahb.onThemeChanged((theme) => {
  console.log("Theme:", theme.effective);
});
```

---

### Update Events
**Type:** `event` (one-way)  
**Description:** Multi-channel update events consolidated into single callback.

**Event Kinds:**
- `"checking"`: Update check started
- `"available"`: Update available, downloading
- `"not-available"`: Already on latest version
- `"downloaded"`: Update ready to install
- `"error"`: Update check/download failed (includes error data)

**Usage:**
```typescript
const cleanup = window.ahb.onUpdateEvent((event) => {
  switch (event.kind) {
    case "checking":
      console.log("Checking for updates...");
      break;
    case "available":
      console.log("Update available, downloading...");
      break;
    case "not-available":
      console.log("Already on latest version");
      break;
    case "downloaded":
      console.log("Update ready! Restart to install");
      break;
    case "error":
      console.error("Update failed:", event.data);
      break;
  }
});
```

---

## Error Handling

All `handle` type IPCs (invoke/response) can throw errors:

```typescript
try {
  await window.ahb.addProduct({ nameBn: "Test", unit: "kg", price: 100 });
} catch (error) {
  console.error("Failed to add product:", error.message);
}
```

Common error scenarios:
- **File operations**: User cancels dialog, permission denied, encryption failure
- **Data operations**: Validation errors (duplicate ID, out of range, etc.)
- **Reports**: Invalid date format
- **Settings**: Invalid values

---

## Type Definitions

All TypeScript types are defined in:
- **Main process**: `src/main/data.ts`
- **Preload API**: `src/preload.ts`
- **Global types**: Available via `Window.ahb` interface

Import types in renderer:
```typescript
import type { Product, Customer, Invoice } from './main/data';
```

---

## Notes

1. **Date Formats**: 
   - API accepts/returns ISO 8601 format (`YYYY-MM-DD`)
   - Reports display DD-MM-YYYY format for Bengali locale

2. **ID Ranges**:
   - Products: 1-99999
   - Customers: 1-99999
   - Duplicate IDs are rejected

3. **Encryption**: All `.ahbs` files use AES-256-GCM encryption

4. **Memory**: Files >100MB trigger warnings, cache limited to 50MB

5. **Concurrency**: Operations are sequential (no concurrent file writes)

6. **Cleanup**: Always call cleanup functions returned by event listeners to prevent memory leaks
