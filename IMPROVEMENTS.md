# Improvement Roadmap for AHB Sales

This document tracks potential improvements for the AHB Sales application. Mark items with `[x]` to implement or `[-]` to skip.

---

## Architecture

- [ ] **1. Extract business logic from main.ts** - Refactor 817-line main.ts into separate service modules (FileService, InvoiceService, etc.)
- [ ] **2. Separate data layer from IPC handlers** - Create clean separation between business logic and Electron IPC communication
- [ ] **3. Implement Pinia state management** - Replace scattered Vue refs with centralized Pinia store for better state management

## Code Quality

- [ ] **4. Replace `any` types with `unknown`** - Fix 3 error handlers using `any` type for better type safety
- [ ] **5. Implement logger utility** - Create centralized logging service to replace scattered console.error calls
- [ ] **6. Remove magic numbers** - Extract hardcoded values (e.g., Product ID range 1-1000) to constants
- [ ] **7. Centralize date handling** - Unify date format conversions (ISO/YMD/DD-MM-YYYY) into date utility module
- [ ] **8. Decompose Dashboard.vue** - Break down 962-line component into smaller, focused components

## Testing

- [ ] **9. Add Vue component tests** - Implement missing component tests using Vue Test Utils
- [-] **10. Add E2E tests** - Create integration/E2E tests for critical user flows (invoice creation, reports, etc.)
- [x] **11. Expand CI matrix** - Add macOS and Linux to CI pipeline (currently Windows only)

## Security

- [x] **12. Add password-based encryption** - Implement optional password layer on top of key-based encryption
- [x] **13. Document key rotation strategy** - Create migration plan for updating encryption keys
- [x] **14. Implement audit logs** - Track data changes for accountability and debugging

## Performance

- [ ] **15. Add pagination/virtualization** - Implement virtual scrolling for large product/customer lists
- [ ] **16. Optimize memory usage** - Consider streaming or chunked loading for large .ahbs files
- [ ] **17. Optimize search algorithms** - Replace linear array searches with Map or indexed structures

## Developer Experience

- [ ] **18. Add IPC API documentation** - Document all Electron IPC handlers and their contracts
- [ ] **19. Enable TypeScript strict mode** - Gradually enable strict compiler options for better type checking
- [ ] **20. Standardize package manager** - Remove either bun.lock or package-lock.json, use one consistently. Yes I want to use bun only.
- [-] **21. Add development tooling** - Set up pre-commit hooks (Husky), changelog generation, contribution guide
- [ ] **22. Clean up gitignore** - Ensure `out/`, `.vite/`, and other build artifacts are properly ignored

## User Experience

- [x] **23. Implement undo/redo** - Add command pattern for undoable operations in data entry
- [x] **24. Add auto-backup mechanism** - Periodically save backup copies of .ahbs files
- [x] **25. Add export to CSV/Excel** - Enable data export in standard formats beyond encrypted .ahbs
- [ ] **26. Enhance keyboard shortcuts** - Improve accessibility with comprehensive keyboard navigation

## Production

- [x] **27. Add error monitoring** - Integrate Sentry or similar service for production error tracking
- [-] **28. Implement update rollback** - Add safety mechanism to revert failed updates
- [x] **29. Multi-branch sync strategy** - Design approach for merging/syncing data across branch files

---

## Instructions

1. Mark items you want to implement with `[x]`
2. Mark items to skip with `[-]`
3. Leave items as `[ ]` if undecided
4. Add notes or priority levels below any item if needed
