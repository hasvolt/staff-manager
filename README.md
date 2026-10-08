# Staff Manager

> Smart, offline-first Staff, Attendance & Payroll Manager for local business owners, contractors, shops, workshops, farms, and households.

Sister product of **Daily Khata Pro**, hosted at [https://staff.rozfiber.com](https://staff.rozfiber.com).

---

## Key Features

- **Local-First & Offline Ready**: All actions save immediately to IndexedDB and sync in the background to Supabase.
- **12 Accessible Visual Themes**: Carefully balanced color tokens and solid contrast (Emerald Black, Deep Obsidian, Monochrome, Day White, etc.).
- **16 Languages Supported**: Including English, Hindi, Urdu, Bengali, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia, Assamese, Nepali, Arabic, and Spanish (with native RTL support for Urdu and Arabic).
- **Inbuilt Calculator**: Simple, tactile calculation (+, -, ×, ÷, %) accessible directly from any amount input field and the header, plus direct redirect to Daily Khata Pro advanced calculators.
- **Wages, Advances & Payroll Ledger**: Automated daily wage, prorated monthly salaries (fixed 30 or actual calendar days), piece work, overtime, bonuses, deductions, penalties, loans, and duplicate payment protection.
- **Month Settlement & Locked Periods**: Settle monthly payroll with one tap, lock periods to prevent accidental tampering, and owner-only unlock audits.
- **Financial Dashboard & Labour Costing**: Live cost breakdown by site, role, and monthly trends with privacy mask mode.
- **Multi-Role & Enterprise Ready**: Granular RBAC (Owner, Manager, Supervisor, Accountant, Viewer) and Supabase Row Level Security (RLS).
- **Zero Data Loss**: Soft delete with Recycle Bin restore, revision history, and audit logging.

---

## Quick Start & Setup

### 1. Prerequisites
- Node.js 20+ / Bun
- NPM or Bun

### 2. Install Dependencies
```bash
bun install
# or
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Set your Supabase credentials and product URLs:
```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_APP_NAME="Staff Manager"
VITE_APP_URL="https://staff.rozfiber.com"
VITE_DAILY_KHATA_URL="https://www.rozfiber.com"
VITE_ADVANCED_CALCULATOR_URL="https://www.rozfiber.com/calculator"
VITE_ENABLE_LOCAL_MODE="true"
```

### 4. Run Development Server
```bash
bun run dev
# or
npm run dev
```

### 5. Build for Production
```bash
bun run build
# or
npm run build
```

### 6. Run Test Suite
```bash
bun run test
# or
npm run test
```

---

## Project Structure

```
staff-manager/
├── docs/                     # Architectural & operational documentation
├── public/                   # Icons, PWA manifest assets, robots.txt
├── src/
│   ├── app/                  # App routes, shell, error boundary
│   ├── components/           # UI Kit components (Button, Modal, Card, etc.)
│   ├── features/             # Domain modules (auth, staff, attendance, payments, etc.)
│   ├── lib/                  # Utilities (format, i18n, theme, permissions, pwa, supabase)
│   ├── locales/              # 16 complete language translation files
│   ├── styles/               # 12 accessible themes & CSS variables
│   └── main.tsx              # Application entry point with PWA SW registration
├── supabase/migrations/      # Versioned PostgreSQL migrations
└── vercel.json               # SPA routing & strict Content Security Policy
```

---

## License
Proprietary &copy; 2026 Hasan Smart Electrical Solutions / Rozfiber.
