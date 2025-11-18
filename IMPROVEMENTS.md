# Improvement Roadmap for AHB Sales

This document tracks potential improvements for the AHB Sales application. Mark
items with `[x]` to implement or `[-]` to skip.

---

## Architecture

- [x] **1. Extract business logic from main.ts** - ✅ Refactored 817-line
      main.ts into service modules (FileService, SettingsService, MenuService,
      UpdateService, DataService). Reduced to 237 lines (71% reduction).
- [x] **2. Separate data layer from IPC handlers** - ✅ Created DataService to
      handle all data operations, IPC handlers now delegate to services.
- [-] **3. Implement Pinia state management** - Skipped. Current ref-based state
  management is sufficient for app size. Can revisit if complexity grows.

## Code Quality

- [x] **4. Replace `any` types with `unknown`** - ✅ Fixed 3 error handlers
      using proper type guards (instanceof Error)
- [x] **5. Implement logger utility** - ✅ Created centralized Logger service
      with context & timestamp. Replaced console.\* calls across all main
      process services.
- [x] **6. Remove magic numbers** - ✅ Extracted constants (MIN/MAX_PRODUCT_ID,
      MIN/MAX_CUSTOMER_ID, toast durations, print delays) to
      src/constants/business.ts. Updated 15+ files to use constants.
- [x] **7. Centralize date handling** - ✅ Created src/utils/date.ts with
      unified date functions (nowIso, toYmd, todayYmd, formatDate,
      formatDateOnly, dateToIso). Removed duplicate date formatting logic from
      10+ components.
- [x] **8. Decompose Dashboard.vue** - ✅ Split 972-line component into 7
      focused components: FileInfoPanel, CustomerSearch, InvoiceSummary,
      QuickActions, CustomerInfoBanner, ReceiptTable, ProductSearch. Reduced to
      642 lines (34% reduction).

## Testing

- [ ] **9. Add Vue component tests** - Implement missing component tests using
      Vue Test Utils
- [-] **10. Add E2E tests** - Create integration/E2E tests for critical user
  flows (invoice creation, reports, etc.)
- [x] **11. Expand CI matrix** - Add macOS and Linux to CI pipeline (currently
      Windows only)

## Security

- [x] **12. Add password-based encryption** - Implement optional password layer
      on top of key-based encryption
- [x] **13. Document key rotation strategy** - Create migration plan for
      updating encryption keys
- [x] **14. Implement audit logs** - Track data changes for accountability and
      debugging

## Performance

- [ ] **15. Add pagination/virtualization** - Implement virtual scrolling for
      large product/customer lists (Modal views use ID navigation)
- [ ] **16. Optimize memory usage** - Consider streaming or chunked loading for
      large .ahbs files
- [ ] **17. Optimize search algorithms** - Replace linear array searches with
      Map or indexed structures

## Developer Experience

- [ ] **18. Add IPC API documentation** - Document all Electron IPC handlers and
      their contracts
- [ ] **19. Enable TypeScript strict mode** - Gradually enable strict compiler
      options for better type checking
- [ ] **20. Standardize package manager** - Remove either bun.lock or
      package-lock.json, use one consistently. Yes I want to use bun only.
- [-] **21. Add development tooling** - Set up pre-commit hooks (Husky),
  changelog generation, contribution guide
- [ ] **22. Clean up gitignore** - Ensure `out/`, `.vite/`, and other build
      artifacts are properly ignored

## User Experience

- [x] **23. Implement undo/redo** - Add command pattern for undoable operations
      in data entry
- [x] **24. Add auto-backup mechanism** - Periodically save backup copies of
      .ahbs files
- [x] **25. Add export to CSV/Excel** - Enable data export in standard formats
      beyond encrypted .ahbs
- [ ] **26. Enhance keyboard shortcuts** - Improve accessibility with
      comprehensive keyboard navigation

## Production

- [x] **27. Add error monitoring** - Integrate Sentry or similar service for
      production error tracking
- [-] **28. Implement update rollback** - Add safety mechanism to revert failed
  updates
- [x] **29. Multi-branch sync strategy** - Design approach for merging/syncing
      data across branch files

---

## Instructions

1. Mark items you want to implement with `[x]`
2. Mark items to skip with `[-]`
3. Leave items as `[ ]` if undecided
4. Add notes or priority levels below any item if needed
