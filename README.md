# AHB Sales

A desktop app (Electron + Vue 3 + Vite + Tailwind + TypeScript) to replace the Microsoft Access-based wholesale management system for Abdul Hamid & Brothers. Each .ahbs file contains all cumulative business data for a single branch.

This README reflects the current implementation.

## Current Status (at a glance)

- File container: Encrypted .ahbs (AES-256-GCM, versioned header) with a JSON payload.
- File ops: New, Open, Save, Save As with unsaved-change prompts.
- Data: Products, Customers, Invoices (with Paid/Previous Due/Current Due), Purchases.
- UI: Startup (New/Open), Dashboard for invoice entry, modals for Products, Customers, Customer History, Product Sales History, Product Purchase History, and Purchase Entry.
- Reports & printing: Three report modals (Money Transaction — Customer Range, Money Transaction — Day Wise, Daily Payment) with print previews; invoice printing; saved print presets (paper/orientation/margins) via Settings.
- Rounding: ceil to 2 decimals consistently (line totals, subtotals, net, due).
- i18n: Runtime language switching (BN/EN) across the renderer; main views/components are localized with EN/BN dictionaries and parameterized messages with EN fallback.
- Feedback: Non-blocking toasts for success and errors across key flows (invoice post, report loading, settings, purchase entry).
- Tests: Unit and component tests for crypto, data, invoices (incl. paid/due), purchases, i18n, renderer views.
- CI: Lint, package, and test on PRs (Windows runner).
- Updates: Auto-update initialized via update-electron-app with GitHub Releases (menu: Check for Updates). A cross-OS GitHub Actions workflow publishes artifacts on tag.

## Architecture and File Format

- Single-document app: one .ahbs file open at a time.
- One file = one branch; no inter-branch logic.
- Encrypted container:
  - Format: [MAGIC "AHBS"][VERSION 1][IV][TAG][CIPHERTEXT(JSON)]
  - Cipher: AES-256-GCM
- Payload: JSON document with versioned schema; currently stores products, customers, invoices, purchases, and sequence counters.

## Key Management (important)

- Encryption key is supplied via the environment variable AHB_KEY_HEX (64 hex chars = 32 bytes).
- During development, you can store it in a .env file at the repo root (used at runtime by the app in dev).
- The same key is required to open previously created .ahbs files; keep it safe and consistent.
- If the key is missing/invalid, the app refuses to open or save encrypted files (by design).

Generate a key (example):

- node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Set up in development:

- Create a .env file with AHB_KEY_HEX=<your_64_char_hex_key>

Set up in packaged/production:

- Configure AHB_KEY_HEX as an environment variable in the target OS before launching the app.

Notes:

- Unit tests provide their own deterministic key; this does not affect runtime builds.
- There is no key rotation and no password prompt in v1.

## Getting Started (development)

Prerequisites

- Node.js 20+ (project CI uses Node 22)
- A valid AHB_KEY_HEX in your environment (or .env in repo root)

Install

- npm install

Run (development)

- npm start

Lint

- npm run lint

Tests

- npm test

Package

- npm run package

## Updates & Releases

- Auto-update library: update-electron-app (GitHub Releases as update source).
- Manual trigger: Application menu → Settings → Check for Updates.
- Renderer UX: Non-blocking toast on checking/available/not-available; restart button appears after download.

Publish a release

1. Set secrets in GitHub repo:

- GH_TOKEN (required for publishing)
- AHB_KEY_HEX (required at runtime to build encrypted containers)
- Optional for macOS notarization: APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, TEAM_ID

2. Push a tag like v1.0.1 to trigger the workflow.
3. Workflow runs on macOS/Windows/Linux and uploads artifacts to the GitHub Release (draft by default).

Notes

- Code signing/notarization are required for seamless updates on macOS and recommended on Windows. Fill in the secrets to enable.
- Linux auto-update is a no-op; artifacts are still built and uploaded for manual distribution.

## Functional Scope

Core business rules

- Wholesale trading model.
- One file per branch; file lifespan is user-defined (daily/weekly/long-lived).
- Currency: Bangladeshi Taka (৳), displayed with 2 decimals.
- Rounding policy: ceil to 2 decimals for monetary math (line totals, subtotal, net, due).
- Product ID range: 1–1000 inclusive (enforced).
- Single unit per product; no unit conversions.

Implemented features

1. File operations

- New/Open/Save/Save As and unsaved-change prompts on new/open/close/quit flows.
- Manual save: the app tracks dirty state; there is no autosave.

2. Customer management

- Add, list, update basic fields (ID, name, address, active).
- Outstanding (due) is persisted and updated by invoice posting and cannot be edited after creation.

3. Product management

- Add, list, update (ID, name, unit, price, stock, active).
- Product stock is decremented on invoice posting and incremented on purchase entry.

4. Invoice management

- Draft and post invoices on the Dashboard.
- Lines: product, quantity, rate override, unit, line totals.
- Totals: discount (validated), subtotal, net, paid, previous due, due, current due.
- Validations: non-negative discount/paid, paid ≤ previousDue + net, etc. Stock may go negative per policy (no availability block).
- Updates customer outstanding to current due on posting.

5. Purchase entry

- Add purchases (product, quantity); increments product stock.
- Product Purchase History view.

6. Histories

- Customer History: rows of Date, Total, Bill (Net), Paid, Due, Previous Due, Current Due, Comment.
- Product Sales History: sales lines per product (Date, Invoice #, Customer, Quantity, Rate, Total).
- Product Purchase History: quantities added per product (Date, Quantity, Unit).

7. i18n

- Language setting persisted (BN/EN) and applied to the application menu with runtime switching.
- Renderer-wide localization for major views (Dashboard, Settings, Products/Customers, histories, and reports). Parameterized translations (e.g., invoice saved message).

Not yet implemented (planned)

- Full UI localization for all views and labels.
- Bulk import/migration; roles/auth (out of scope for v1).
- Full UI localization for all views and labels.
- Bulk import/migration; roles/auth (out of scope for v1).

## Data Model (high level)

Product

- id (1–1000), nameBn, nameEn?, description?, unit, price, stock, active, createdAt, updatedAt

Customer

- id (>0 int), nameBn, nameEn?, address?, outstanding, active, createdAt, updatedAt

Invoice (posted)

- id, no (sequence), date (ISO), customerId
- lines: sn, productId, unit, description?, quantity, rate, lineTotal
- discount, notes?, totals { subtotal, net }
- paid, previousDue, currentDue
- status ("posted"), createdAt, updatedAt

Purchase

- id, date (ISO), productId, unit, quantity, notes?, createdAt, updatedAt

## UI Overview

- Startup screen: New File / Open File.
- Dashboard:
  - Header: New/Open/Save/Save As via header buttons and application menu.
  - Settings: a Settings button to configure and persist print presets (paper size, orientation, margins).
  - Customer search and selection.
  - Product search/add for receipt lines.
  - Summary: Total, Discount, Bill (Net), Paid, Due, Previous Due, Net Due, Notes.
  - Complete button posts the invoice.
  - Quick Actions open modals: Customers, Products, Customer History, Product Sales History, Product Purchase History, Purchase Entry, and three Reports (Money Transaction — Customer Range, Money Transaction — Day Wise, Daily Payment).
- Modals:
  - Products: navigate by ID, add or update details, view list.
  - Customers: navigate by ID, add or update details, view list.
  - Histories and Purchase Entry as described under features.
  - Reports: each report opens in its own modal with a scrollable preview and sticky table headers for better readability.

## Tests and CI

- Unit tests: crypto container, data model operations, invoices (math/validations), purchases, i18n persistence.
- Component tests: App, Dashboard, Products/Customers views and event refresh.
- CI (PRs to main/develop on Windows): install, lint, package, test.

## Phase-wise Implementation Plan

Phase 0: Foundations and architecture — DONE

- Encrypted .ahbs container (AES-256-GCM, versioned header).
- AHB_KEY_HEX required via environment; no insecure fallback.
- New/Open/Save/Save As with user-friendly error handling.
- Runtime language switching for app menu (BN/EN) with persisted setting.
- Initial tests and CI on PRs.

Phase 1: Domain schema and core lists — DONE

- Products and Customers storage/validation.
- IPC endpoints and preload bindings.
- UI to add/list/update Products and Customers.
- Manual save with dirty tracking and prompts; no autosave.

Phase 2: Sales and stock — DONE

- Dashboard invoice posting: header, lines, summary.
- Ceil-to-2 rounding policy across calculations.
- Discount validations and stock checks.
- Stock decremented on posting; customer outstanding updated.

Phase 3: Payments, histories, purchases — DONE

- Paid input enabled in Dashboard; due math enforced:
  - paid ≥ 0 and ≤ previousDue + net
  - previousDue/currentDue snapshots per invoice
- Listings:
  - listInvoicesByCustomer, listProductSales, listProductPurchases.
- UI:
  - Customer History modal.
  - Product Sales History modal.
  - Product Purchase History modal.
- Purchase entry:
  - postPurchase increments stock and populates purchase history.

Phase 4: Reporting and printing — DONE

- Reports (all dates displayed as DD-MM-YYYY):
  - Money Transaction — Customer Range (date range filter)
    - Columns: Date, Customer Name, Net Bill, Paid, Due, Previous Due, Total Due.
  - Money Transaction — Day Wise (date range filter)
    - Columns: Customer Name, Bill, Discount, Net Bill, Paid, Due, Previous Due, Total Due; grouped by day.
  - Daily Payment Report (single date)
    - Columns: Customer Name, Paid Amount.
- Printing:
  - Print preview and direct print for all reports and invoices.
  - Print presets (paper size, orientation, margins) are configurable and persisted; defaults: A4, portrait, 12mm margins.
  - Settings modal to manage presets; printing uses browser-like rendering with OS print dialog.

Phase 5: Usability and polish — DONE

- Renderer-wide i18n: BN/EN dictionaries with runtime switching and parameterized strings; EN fallback.
- Search UX: Customer/product search boxes support keyboard navigation (up/down/enter/esc) and highlighted selection.
- Toasts: Replaced blocking alerts with non-blocking toasts for success/error in Dashboard, reports, settings, and purchase entry.
- Menu consistency: Application menu rebuilds after New/Open/Save/Save As to keep enable/disable state and labels in sync.
- Theme and typography: Added Bengali-friendly font stack; introduced `.btn`, `.btn-primary`, `.btn-accent` classes and adopted them in key controls (e.g., reports, settings).
- Policies (domain + UI):
  - Negative stock allowed: Posting an invoice may reduce product stock below zero. UI highlights lines that oversell and asks for confirmation before completing.
  - Outstanding only on create: The Outstanding field can be set when adding a customer and isn’t editable afterward; subsequent changes occur via invoices/payments. Enforced in domain logic and tests.
- Reports and printing: Report modals show inline previews with sticky headers and use print presets from Settings.
- Tests updated: Unit/component tests reflect new policies and i18n runtime; all tests green.

Phase 6: Performance and hardening — PLANNED

- Indexing/caching, compaction, and backups.
- Integrity checks on load/save; schema migrations across versions.
- Optional exports: CSV/Excel for reports (PDF via print-to-PDF).

Phase 7: Future-ready hooks — PLANNED

- Per-file branch label, schema versioning/migrations, role hooks (disabled).
- Extensibility points verified with sample files and migrations.

## Decisions and Policies

- One file equals one branch; no multi-branch logic.
- Product IDs are integers 1–1000.
- Monetary rounding: ceil to two decimals (policy set and enforced).
- Report date display: DD-MM-YYYY for user-facing outputs; internal data uses ISO (YYYY-MM-DD).
- No QR/barcodes in invoices v1.
- No data import/migration in v1; no auth/roles in v1.
- Stock policy: Negative stock is allowed. Posting an invoice may decrease a product's stock below zero; no hard block on availability. UI highlights overselling lines and requests confirmation on Complete.
- Outstanding policy: Can be set at customer creation, not editable afterward; updated only by invoice posting logic.

## Known Gaps / Next Steps

- Extract a reusable toast component/composable to reduce duplication; standardize success/error/info variants.
- Replace window.confirm on negative stock with a small in-app confirm modal for consistency with toasts.
- Adopt `.btn` styles across all remaining CTAs for consistent theme usage.
- Remove temporary template lint disables in complex views (Dashboard, Reports hub) by reformatting to strict Vue ESLint rules.

## Notes

- Legacy system used file-per-day with cumulative data; this app lets users choose file lifespan.
- Printing and bilingual support are significant to end users and prioritized in upcoming phases.

## Reports and Printing

Overview

- Three reports are available from the Dashboard as separate buttons. Each opens a dedicated modal with a scrollable preview and sticky table headers.
- All report dates are displayed as DD-MM-YYYY. Date inputs/filters accept YYYY-MM-DD.
- All tables follow the app’s rounding policy (ceil to two decimals).

Reports

- Money Transaction — Customer Range (From/To): rows across all customers within the range with columns Date, Customer, Net Bill, Paid, Due, Previous Due, Total Due.
- Money Transaction — Day Wise (From/To): grouped by day with customer rows and columns Bill, Discount, Net Bill, Paid, Due, Previous Due, Total Due.
- Daily Payment (Date): per-customer payments for the given date with total paid at bottom.

Printing

- Reports and invoices can be printed. A browser-like print preview opens and the OS print dialog handles the actual print.
- Print presets control the page: paper size, orientation, and margins. Defaults are A4, portrait, 12mm.
- Presets are persisted in an app settings file under the OS user data directory and can be changed via the Settings button on the Dashboard.

Invoice Printing

- Invoices can be printed from the Dashboard and from Customer History using a shared print template for consistent layout and styling.

## QA: Phase 4/5 sanity checks

We include lightweight scripts to generate seed data and verify report outputs.

1. Generate a seed file

- Creates an encrypted .ahbs with demo products, customers, invoices, and purchases.
- Output path: seeds/seed-phase4.ahbs

2. Run the Phase 4 QA script

- Decrypts the seed and runs the three report data functions over a recent 7-day range.
- Logs ranges, counts, and totals for sanity checks.

Example results from a 7-day seed on a development machine:

- Customer Range: 89 rows; totals — Net Bill 158,963.01; Paid 145,908.00; Due 56,030.86
- Day Wise: 7 days; first day rows: 10
- Daily Payment (sample day): 12 rows; total paid: 18,510.00

All unit tests and the QA script passed locally when these were recorded.

For Phase 5, we additionally validated:

- i18n runtime selection (BN/EN) with parameterized strings and fallback.
- Component behaviors: keyboard search navigation, toasts on errors (e.g., report load failures), and invoice completion success toast.
- Negative stock UI: oversell rows highlighted; confirm prompt shown prior to posting.
