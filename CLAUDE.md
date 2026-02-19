# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

Package manager is **Bun**. All commands use `bun run`.

- `bun install` — install dependencies
- `bun run start` — launch Electron app in dev mode (electron-forge)
- `bun run package` — package the app (no installer)
- `bun run make` — build distributable installer
- `bun run lint` — ESLint across .ts and .tsx files
- `bun run type-check` — TypeScript type checking (`bunx tsc --noEmit`)
- `bun run test` — run unit/component tests (Vitest, single pass)
- `bun run test:watch` — Vitest in watch mode
- `bun run test:e2e` — Playwright E2E tests (requires `bun run package` first)
- `bun run test:all` — unit tests then E2E tests
- `bun run seed` — generate QA seed data

Run a single unit test file: `bunx vitest run tests/invoice.test.ts`

## Architecture

Electron desktop app (three-process model) with Vue 3 renderer.

### Process Boundaries

```
Main Process (src/main.ts)
  ├── FileService    — file new/open/save, AES-256-GCM encrypt/decrypt, atomic writes
  ├── DataService    — wraps domain logic (data.ts), maintains O(1) Map indexes (dataIndex.ts)
  ├── SettingsService — print/theme/language prefs in userData/settings.json
  ├── MenuService    — native Electron menu, rebuilt on language/state changes
  └── UpdateService  — auto-update via GitHub Releases

Preload (src/preload.ts)
  └── Exposes typed `window.ahb` API via contextBridge

Renderer (src/renderer.ts → App.vue)
  ├── Pinia stores: file.ts, modal.ts, app.ts
  ├── Views: Dashboard + full-page modals (Products, Customers, Reports, etc.)
  └── Custom i18n (src/i18n/) with Bengali/English, {param} interpolation
```

### Key Design Patterns

- **Single-document model**: one `.ahbs` file = one branch's complete data. No database — all data lives in memory and is serialized to an encrypted binary file (AHBS magic header + AES-256-GCM).
- **Domain logic is pure TypeScript** in `src/main/data.ts` — no Electron imports, easily testable. All CRUD, invoice posting, purchase posting, and report aggregation lives here.
- **IPC bridge**: all renderer↔main communication goes through `window.ahb` (defined in preload.ts). The main process registers `ipcMain.handle()` handlers in `main.ts`.
- **Modal navigation**: `modalStore.navigateTo()` manages which full-page modal view is shown. `App.vue` renders all modals via `v-if` flags.
- **Monetary rounding**: `ceil2 = Math.ceil(n * 100) / 100` (ceiling to 2 decimal places) used throughout.

### Encryption

Files use AES-256-GCM. The key comes from the `AHB_KEY_HEX` environment variable (64 hex chars = 32 bytes). See `.env.example`. Tests set this to a deterministic value before importing crypto modules.

### Styling

Tailwind CSS with `darkMode: "class"`. Theme toggling adds/removes `.dark` on the root element. No Prettier — formatting is handled by ESLint only.

## Testing

- **Unit/component tests** (`tests/`): Vitest + jsdom + @vue/test-utils. Cover domain logic (data, invoices, purchases, reports, crypto) and Vue components (App, Dashboard).
- **E2E tests** (`e2e/`): Playwright launching the packaged Electron app. Must run `bun run package` before E2E tests.

## CI

PR workflow (`.github/workflows/pr.yml`): runs on `windows-latest` — lint → package → unit tests → E2E tests. Release workflow publishes to GitHub Releases as draft.
