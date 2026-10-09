# Contributing & Engineering Guidelines - Staff Manager

Thank you for contributing to Staff Manager. Staff Manager is built for small business owners, contractors, shops, workshops, and households across multiple languages and geographies.

---

## 1. Core Engineering Principles

1. **Zero-Loss Data Architecture**:
   - Soft-delete everywhere (`deleted_at`).
   - Trash allows instant undo and restore.
   - Every mutation increments `revision` and creates an audit log entry.
2. **Local-First & Offline Resilience**:
   - Write to local IndexedDB (`dexie.ts`) immediately without blocking on network requests.
   - Outbox queues offline changes with client UUIDs.
   - Sync engine handles background retry with exponential backoff.
3. **Strict Privacy**:
   - Never request or store national ID documents, credit card numbers, or full bank credentials.
   - Any financial notes or UPI IDs are optional free text for user convenience.
4. **Theme & Localization Integrity**:
   - Never hardcode CSS colors; use CSS theme tokens (`--bg`, `--surface`, `--accent`, etc.) to support all 12 themes.
   - Every UI string must pass through `t('key')` across all 16 supported languages. RTL layout must be preserved for Urdu and Arabic.
5. **No External Breakages**:
   - Keep dependencies lightweight. Heavy libraries (such as `jspdf`, `jspdf-autotable`, `chart.js`) must be dynamically lazy-loaded.

---

## 2. Directory Conventions

- `src/app`: Shell, routes, navigation, and top-level layouts.
- `src/components/ui`: Primitive UI components (Modal, Button, Input, FormField, Badge, Card, etc.).
- `src/features`: Domain modules (`attendance`, `auth`, `calculator`, `help`, `history`, `home`, `legal`, `members`, `org`, `payments`, `reports`, `settings`, `staff`, `sync`, `trash`, `work`).
- `src/lib`: Core infrastructure (`calculations`, `db`, `export`, `format`, `i18n`, `permissions`, `print`, `supabase`, `sync`, `theme`).
- `src/locales`: 16 language dictionaries with strict type checks.
- `supabase/migrations`: Versioned SQL migrations.
- `docs`: Architecture, deployment, permissions, and database guides.
