# Testing Strategy & Automated Test Suite - Staff Manager

Staff Manager maintains a test suite executed via Vitest and Testing Library. All tests execute with offline-first in-memory IndexedDB (`fake-indexeddb`) and mocked Supabase APIs.

---

## 1. Test Suite Overview

| Test File | Test Suite Focus | Test Cases |
| :--- | :--- | :--- |
| `phase2.test.ts` | Staff Profiles, Attendance, Work, Sites & Trash | 5 tests (1000+ staff performance, soft delete, restore) |
| `phase3.test.ts` | Wage Math, Proration, Advances, Dues & Period Locks | 10 tests (Daily, monthly, hourly, piece-rate, period lock) |
| `phase4.test.ts` | History, Reports, Statements, Multi-Month, PDF & CSV | 6 tests (3+ months, 100+ staff computation, UTF-8 BOM, print) |
| `phase5.test.ts` | Roles (RBAC), Multi-User, Conflicts, Backup & CSV Import | 5 tests (Invite hierarchy, conflict resolution, full JSON restore, import rollback) |
| `profile.test.ts` | User Profile Persistence & Cross-Device Sync | 6 tests (Reload retention, local IndexedDB mirror, upsert fallback) |
| `calculator.test.ts` | Inbuilt Basic Calculator Arithmetic | 4 tests (Decimals, percentage arithmetic, history, input buffer) |
| `dexie.test.ts` | IndexedDB Local Schema & Storage | 5 tests (CRUD operations, outbox queue, snapshots) |
| `rls.test.ts` | Role-Based Access Control Boundaries | 5 tests (Owner, manager, supervisor isolation) |
| `theme.test.ts` | 12 Visual Themes & Contrast Tokens | 3 tests (Token presence, contrast standards, no-flash storage) |
| `i18n.test.ts` | 16 Languages & Translation Keys | 6 tests (English fallback, RTL flags, Intl formatting) |

**Total Tests**: **55 passing tests across 10 test suites**.

---

## 2. Running Tests

Run the full automated test suite:
```bash
npm test
```

Run tests with test coverage or watch mode:
```bash
npx vitest run
npx vitest watch
```

Run TypeScript strict type checking and linting:
```bash
npm run lint
```

Build production PWA bundle:
```bash
npm run build
```
