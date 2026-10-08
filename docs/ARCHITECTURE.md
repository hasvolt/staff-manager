# Staff Manager - Architecture & Data Flow

## 1. Architectural Layers

```
UI (Components, Pages, Modals)
  ↓
Hooks & Services (useI18n, useTheme, useCalculator, useToast)
  ↓
Repository Interface (CRUD, soft-delete, queries)
  ↓
LocalRepository (Dexie / IndexedDB) [Immediate offline writes]
  ↓
SyncEngine (Outbox + incremental pull with updated_at cursors)
  ↓
Supabase (PostgreSQL with RLS + Auth + Storage + Realtime)
```

## 2. 12 Theme Tokens

All themes strictly adhere to the following tokens:
- `--bg`, `--surface`, `--surface-2`, `--border`
- `--text`, `--text-muted` (solid color, not opacity)
- `--accent`, `--accent-contrast`
- `--card-from`, `--card-to` (clear 1px border gradient)
- `--income`, `--expense`, `--btn-income`, `--btn-expense`, `--warning`

## 3. Localization (16 Languages)

- English (`en`), Hindi (`hi`), Urdu (`ur` - RTL), Bengali (`bn`), Marathi (`mr`), Gujarati (`gu`), Punjabi (`pa`), Tamil (`ta`), Telugu (`te`), Kannada (`kn`), Malayalam (`ml`), Odia (`or`), Assamese (`as`), Nepali (`ne`), Arabic (`ar` - RTL), Spanish (`es`).
- Dynamic fallback to English for any undefined key.
- RTL automatically toggles `dir="rtl"` on `<html>`.

## 4. Inbuilt Calculator

- Integrated into every numeric amount input (`NumberInput.tsx`).
- Basic arithmetic: `+`, `-`, `×`, `÷`, `%`, decimals.
- "Advanced Calculators" redirection button passes `?amount=<value>` to `VITE_ADVANCED_CALCULATOR_URL`.
