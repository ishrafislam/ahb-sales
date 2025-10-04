# AHB Sales - Requirements Document

## Project Overview

AHB Sales is a desktop application built with Electron to replace the Microsoft Access-based wholesale business management system for Abdul Hamid and Brothers. Each .ahbs file contains all cumulative business data for a single branch (customers, products, transactions, history). The UI is bilingual (Bengali primary, English secondary) with runtime switching.

## File-Based Architecture

- File Extension: `.ahbs` (AHB Sales)
- File Operations: New, Open, Save, Save As
- Behavior: Single-document model (like Notepad) — one file open at a time
- Data Model: Cumulative data retained in the file
- File Security (Confirmed):
  - Encrypted at rest using a single symmetric key (AES-256-GCM recommended), embedded at build time
  - No password prompt and no key rotation
  - Files are only readable by the AHB Sales app; external apps cannot read `.ahbs`
- File Lifecycle Policy (Confirmed):
  - One file equals one branch; no multi-branch logic in a single file
  - Users decide the file’s lifespan (daily/weekly/long-lived)
  - The app just opens a file and loads its contents — no automatic linking across files

## Confirmed Decisions and Terminology

- Terminology: “Item” is called “Product” throughout UI and docs
- Branching: One file = one branch; no inter-branch transfers or consolidation logic
- Identifiers:
  - Invoice numbers: auto-generated
  - Product IDs: numeric; constraint intent “maximum of 1000” — see Open Clarifications
- Inventory:
  - Single unit per product; no conversions
  - Returns add stock back; no separate stock-adjustment flow
- Discounts/Payments:
  - Discount at invoice summary only (no line-level discounts)
  - Previous due can be paid via a new purchase or by adjusting previous invoices
- Localization:
  - Bilingual UI (BN/EN), one language at a time based on settings
  - Left-to-right; runtime language switching without restart
- Currency and Rounding:
  - Bangladeshi Taka (৳), 2 decimal digits
  - Policy: ceil to 2 decimals (see Open Clarifications)
- Printing:
  - Print Preview and Direct Print
  - Printer selection, paper size and margin presets (Office-like)
  - No QR/barcodes on invoices
- Import/Roles:
  - No data import/migration in v1; no authentication/roles in v1
- Performance:
  - “Industry standard” — design for large datasets with indexed lookups and responsive UI

## Core Business Model

- Business Type: Wholesale trading
- Branch Types: Storage facilities and showrooms (one file per branch)
- Cumulative data model (historical records retained)
- Currency: Bangladeshi Taka (৳)

## Identified Features

### 1) Customer Management

- Customer Entry: ID, name (Bengali; English optional), address, outstanding balance, active/inactive
- Operations: add, edit, search (by ID/name), list, history
- History Columns: Date, Total Amount, Discount, Bill, Payment, Due, Payment Against, Previous Due, Notes

### 2) Product Management

- Product Entry: Product ID (numeric), name (Bengali; English optional), description, production cost, unit price, stock, unit (single), active/inactive
- Operations: add, edit, search (by ID/name), list, availability

### 3) Sales/Invoice Management

- Header: auto invoice number, date, previous date reference, customer selection (ID dropdown, name, address)
- Lines: S/N, product name, description, unit, quantity, rate, line total
- Summary: total, discount, bill (net), payment, due, payment against old due, previous outstanding, timestamp/notes
- Operations: create/edit invoice, post transaction, payment processing, print (Single/Direct/Select)

### 4) Purchase Management

- Purchase entry: date, supplier info (free text v1), item-wise purchase recording, cost tracking
- Item Purchase History: date-wise, quantity, unit shown, filter by product

### 5) Product Sale History

- Date-wise sales, customer linkage, quantity, filtering

### 6) Payment Management

- Payment Entry: reference/identity, amount, date/timestamp, notes
- Features: record/edit payments, payment history
- Payment Report: date, customer-wise payments, amounts

### 7) Reporting System

- Daily Report: daily transaction summary, date-range selection
- Client Report (All Client): date-range, columns (Total Sale, Discount, Bill, Payment, Due), customer breakdown with subtotals and previous balance
- Money Transaction Report — Day Wise: includes Payment Against Old Due and Previous Outstanding
- Daily Payment Report

### 8) User Interface Components

- Main Dashboard: company header, invoice ID display, quantity/stock display, developer credit (for legacy parity)
- Navigation Sidebar:
  - Print Options: Single, Direct, Select Print
  - History, Customer Form, Product Form, Client List, Product List, Product Purchase History, Product Sale History, Purchase Entry, Total Sell, Daily Report, Client Report, Daily Payment Report
- Date Display: current date (DD/MM/YY), previous transaction date reference
- Business Info Panel: group/company, location, outstanding
- Search Dialogs: customers/products by ID or name, close button
- Record Navigation: first/prev/next/last/add/edit/post/refresh/ok/cancel/close/done

## Technical Requirements

- Framework: Electron
- UI Language: Bengali primary, English secondary
- Database: Proposed — SQLite as payload inside encrypted `.ahbs`; alternative — structured JSON with indexing (to be finalized in Phase 0)
- Reporting: printing with preview and direct print
- UI/UX: Bengali font support, DD/MM/YY, responsive grids/tables, teal/cyan theme

## Data Model Considerations

- Each file is a self-contained branch
- Cumulative storage with full transaction history and customer ledger
- Inventory management (single-unit products, stock changes via sales/purchases/returns)

## Open Clarifications

1. Product ID constraint: “The id will be numeric and the length will be maximum of 1000.” Please confirm which is intended:
   - Numeric range 1–1000 per file (recommended), or
   - Maximum of 1000 products per file with unique numeric IDs, or
   - Numeric string up to 1000 digits (unlikely)

2. Rounding policy: “No rounding… 2 decimals (we can round to ceil).” Confirm that ceil to 2 decimals is preferred over standard half-up rounding.

## Phase-wise Implementation Plan (No Code Yet)

Phase 0: Foundations and architecture

- Define `.ahbs` container: versioned header + encrypted payload (AES-256-GCM). Decide payload (SQLite recommended). Set up i18n with runtime switching.
- Implement file New/Open/Save/Save As with full-file encryption.
- Acceptance: Encrypted file read/write; language toggles without restart.

Phase 1: Domain schema and core lists

- Schema for Products, Customers, Invoices, InvoiceLines, Payments with indexes.
- Product and Customer forms: add/edit/search/list, active toggle; record navigation.
- Acceptance: Data persists/reloads; product ID constraints enforced.

Phase 2: Sales and stock

- Invoice entry (header, lines, summary). Ledger math: due, Payment Against Old Due, Previous Outstanding.
- Posting updates stock; returns implemented as negative sale/return that adds back stock.
- Acceptance: Create/edit/print invoice (basic); stock consistent; balances correct.

Phase 3: Purchases

- Purchase entry (supplier free text), item lines; product purchase history with filters.
- Acceptance: Purchases persist; stock increases; history correct.

Phase 4: Payments and ledger

- Payment entry (reference, amount, date). Customer ledger/history views.
- Acceptance: Payment report by date; running balances accurate.

Phase 5: Reporting and printing

- Daily report, Client report (All Client), Money Transaction Report — Day Wise, Daily Payment Report.
- Printing: preview and direct with printer/paper/margin presets.
- Acceptance: Reports correct with 2-decimal policy; configurable printing.

Phase 6: Usability and polish

- Search dialogs, Bengali font validation, teal/cyan theme, robust error handling.
- Acceptance: Smooth runtime language switch; stable behavior at scale.

Phase 7: Performance and hardening

- Indexing/caching, compaction, backups. Optional report exports (PDF via print-to-PDF, CSV/Excel later).
- Acceptance: Responsive with large datasets; integrity checks pass.

Phase 8: Future-ready hooks

- Per-file branch label, schema versioning/migrations, role hooks (disabled).
- Acceptance: Extensibility verified; migrations tested on sample files.

## Notes

- Legacy system used file-per-day with cumulative data; this app lets users choose the file lifespan
- Bengali language support is critical; printing is heavily used
- UI should favor legibility and speed over flashy design
