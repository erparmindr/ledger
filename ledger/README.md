# Ledger — Personal Register

A private, offline-first personal finance ledger. No accounts, no cloud, no tracking — everything stays in your browser.

**Live:** [erparmindr.github.io/ledger](https://erparmindr.github.io/ledger/)

---

## Features

### Core
- **Transaction tracking** — Log expenses, income, transfers, and refunds with dates, categories, notes, and amounts
- **Multi-account** — Checking, savings, cash, and credit card accounts with per-account balances
- **Multi-currency** — Supports USD, CAD, EUR, GBP, INR, AUD, JPY with per-account currency selection
- **Running balance** — See your balance update in real-time on the register
- **Transfer system** — 5 default transfer categories, add/rename/delete in Categories page
- **Pending transfers** — Link transfers to destination later, track unmatched transfers from imports
- **Cross-currency transfers** — Handles linked rows across different currencies automatically
- **Refund tracking** — 4th transaction type with smart matching to original expenses
- **Refund picker** — Automatic suggestions based on amount, description, and recency (6-month lookback)
- **Cross-account refunds** — Refund to a different account with "Refund to account" label

### Import & Export
- **CSV import** — Upload bank CSV exports with column mapping
- **Parenthetical negatives** — Handles `($45.20)` format automatically
- **Invert sign toggle** — Flip amounts when importing; auto-inverts for credit card accounts
- **Live sample preview** — See 3 real rows at mapping time before importing
- **Flip Expense↔Income** — Bulk button to swap transaction types after import
- **Statement text import** — Paste transaction text from PDF bank statements (supports TD Bank and generic formats)
- **Auto-categorization** — Built-in keyword matching for 11+ categories plus learned mappings from previous imports
- **Refund auto-detection** — Recognizes refund keywords in CSV imports
- **Full backup/restore** — Export all data as JSON, restore on any device
- **CSV export** — Export filtered transactions as CSV

### Pages
- **Overview** — Dashboard with balance summary, pending transfers, and unlinked refunds cards
- **Transactions** — Full register with type filters (Expense/Income/Transfer/Refund), search, and date range
- **Accounts** — Account cards with balances and credit card view
- **Reports** — Spending breakdown by category (nets refunds), monthly/yearly views
- **Categories** — Tabbed view (Expense/Income/Transfer) with usage stats and delete protection
- **Payees** — Track debts owed to/from friends and contacts
- **Scheduled** — Recurring bills and subscriptions with daily/weekly/monthly/yearly frequency
- **Settings** — Backup, import, reset, and preferences

### Storage
- **IndexedDB primary** — Persistent storage with auto-migration from localStorage
- **Dual-write** — Saves to both IndexedDB and localStorage for compatibility
- **Adapter pattern** — Storage layer designed for future Google Drive sync

### UX
- **Dark/Light theme** — Pitch black dark theme, persisted across sessions
- **Fully offline** — Works without internet after first load (PWA)
- **Installable** — Add to home screen on mobile or desktop
- **Responsive** — Works on mobile with collapsible sidebar, stacked layouts on small screens
- **Search** — Global search across all transactions
- **Date filters** — Today, this week, this month, this year, or custom range
- **Custom dropdowns** — Themed dropdown components replacing native selects
- **FAB button** — Floating "New transaction" button for quick access
- **Sticky sidebar** — Sidebar stays visible while scrolling on desktop
- **WCAG accessible** — 44px touch targets, focus-visible states, proper contrast ratios

---

## Upcoming

- **Google Drive sync** — Sync data across devices using the storage adapter pattern
- **Recurring transactions auto-creation** — Automatically generate transactions from scheduled items
- **Budgeting** — Set monthly budgets by category and track against spending
- **Multi-file import** — Import from multiple CSV/PDF files simultaneously
- **Transaction splitting** — Split a single transaction across multiple categories
- **Enhanced reports** — Trend analysis, year-over-year comparisons, custom date ranges

---

## Tech Stack

- **HTML/CSS/JS** — Vanilla, no frameworks, no build step
- **PWA** — Service worker for offline caching, web manifest for installability
- **IndexedDB** — Primary storage with localStorage fallback
- **Custom components** — Themed dropdowns, modal system, floating action button
- **Lucide Icons** — Loaded via CDN
- **Manrope** — Google Fonts

---

## Project Structure

```
ledger/
├── index.html                          # App shell
├── manifest.json                       # PWA manifest
├── sw.js                               # Service worker (network-first for code)
├── css/
│   └── styles.css                      # All styles (theme tokens, components, layout)
├── js/
│   ├── constants.js                    # Config, currencies, auto-categorization keywords
│   ├── utils.js                        # Helpers, lookups, balance computation
│   ├── store.js                        # Data model, transfer categories
│   ├── modals.js                       # Modal stack system + utility modals
│   ├── modals/
│   │   └── entity-modals.js            # Transaction/Account/Refund/Link modals
│   ├── components/
│   │   ├── transaction-row.js          # Shared transaction row renderer
│   │   └── custom-dropdown.js          # Themed dropdown component
│   ├── pages/
│   │   ├── overview.js                 # Dashboard with balance + pending + refunds cards
│   │   ├── register.js                 # Transaction log with filters
│   │   ├── accounts.js                 # Account cards with balances
│   │   ├── people.js                   # Payees with debt tracking
│   │   ├── reports.js                  # Spending breakdown charts
│   │   ├── recurring.js                # Scheduled transactions
│   │   ├── categories.js               # Tabbed categories with usage stats
│   │   └── settings.js                 # Backup, import, reset
│   ├── services/
│   │   ├── storage.js                  # IndexedDB adapter with localStorage migration
│   │   ├── backup.js                   # JSON/CSV export + restore
│   │   ├── csv-import.js               # CSV parser with column mapping
│   │   └── import-preview.js           # Statement text parser + review UI
│   └── app.js                          # Entry point: nav, router, events, theme
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    └── icon-512-maskable.png
```

---

## Running Locally

Since this is a static site with no build step:

```bash
# Clone
git clone https://github.com/erparmindr/ledger.git
cd ledger

# Serve (pick one)
npx serve .
python -m http.server 8000
# Then open http://localhost:8000
```

---

## Deploying to GitHub Pages

Already deployed at `https://erparmindr.github.io/ledger/`.

To update:
1. Push to `main` branch
2. GitHub Pages auto-deploys from the repo root

---

## Architecture

All modules communicate via the `window.Ledger` namespace. Pages call functions like `window.Ledger.renderPage()`, `window.Ledger.navigateTo()`, etc. No bundler or transpiler — files load in dependency order via `<script>` tags in `index.html`.

The service worker uses a **network-first** strategy for HTML/CSS/JS to ensure updates are always fetched fresh, and a **cache-first** strategy for static assets (icons, fonts).

Storage is handled by an adapter pattern (`js/services/storage.js`) that wraps IndexedDB with automatic migration from localStorage. This design allows future swapping in of cloud storage backends (e.g., Google Drive) without changing any business logic.

---

## License

Private project.
