# Ledger — Personal Finance

A private, offline-first personal finance ledger. No accounts, no cloud, no tracking — everything stays in your browser.

**Live:** [erparmindr.github.io/ledger](https://erparmindr.github.io/ledger/)

---

## Features

### Core
- **Transaction tracking** — Log expenses, income, transfers, and refunds with dates, categories, notes, and amounts
- **Multi-account** — Checking, savings, cash, credit card, and investment accounts with per-account balances
- **Multi-currency** — Any ISO 4217 currency code supported; common currencies shown as suggestions, type any custom code (JPY uses whole units, no decimals)
- **Running balance** — See your balance update in real-time on the register with tabular numerals
- **Transfer system** — 5 default transfer categories, add/rename/delete in Categories page
- **Pending transfers** — Link transfers to destination later, track unmatched transfers from imports
- **Cross-currency transfers** — Handles linked rows across different currencies automatically
- **Refund tracking** — 4th transaction type with smart matching to original expenses
- **Refund picker** — Automatic suggestions based on amount, description, and recency (6-month lookback)
- **Cross-account refunds** — Refund to a different account with "Refund to account" label
- **Category suggestions** — Learns from your history and suggests categories based on description keywords + past mappings

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
- **Overview** — Dashboard with balance summary, mini-cards per account (with reconciliation drift indicators), pending transfers, unlinked refunds, upcoming recurring items, and monthly reconciliation banner
- **Transactions** — Full register with year→month grouped layout, type-aware cascading filters (Type → Account → Currency → Category → Subcategory → Date), export, and search
- **Accounts** — Owner-grouped card tiles with per-owner net worth banners, 5-action kebab menu (Edit, Update Balance, Reconcile, Archive, Delete), owner avatars, and "Needs verification" badges
- **Reports** — Spending breakdown by category (nets refunds, excludes cross-currency transfer artifacts), monthly/yearly views, 4 chart tabs (Bar, Line, Donut, Table), type/account/currency/category/subcategory/search filters
- **Categories** — Tabbed view (Expense/Income/Transfer) with usage stats, collapsible subcategory sections, and delete protection
- **Payees** — Track debts owed to/from friends and contacts
- **Scheduled** — Recurring bills with category/subcategory assignment, auto-post or review-before-posting modes
- **Settings** — Backup, import, reset, and preferences

### Recurring Transactions
- **Category & subcategory** — Assign categories to recurring items; type-aware dropdown cascades (expense categories for expenses, income for income)
- **Auto-post mode** — Due/overdue items post automatically on app load with a toast summary
- **Review mode** — Opt into manual "Confirm & post" for irregular amounts (electric bill, credit card)
- **Per-item setting** — Each recurring item independently set to auto or review
- **Category passthrough** — Posted transactions carry category/subcategory into Reports, breaking no analytics

### Reconciliation
- **Monthly reconciliation banner** — Appears on overview page on the 1st of each month for accounts needing verification
- **Per-account verify** — Click "Verify" on any account to open the reconciliation modal
- **Balance breakdown** — See exactly how the balance was computed (opening + income - expenses + refunds ± transfers)
- **Orphan transfer detection** — Flags transfers with no matching pair on the other end
- **Duplicate detection** — Flags possible duplicate entries (same amount + date + description)
- **Set balance** — Correct your balance in one click — system recalculates opening balance behind the scenes

### Storage
- **IndexedDB primary** — Persistent storage with auto-migration from localStorage
- **Dual-write** — Saves to both IndexedDB and localStorage for compatibility
- **Schema migrations** — Normalization runs on both localStorage and IDB data on boot, so schema changes propagate automatically
- **Adapter pattern** — Storage layer designed for future Google Drive sync

### UX
- **Dark/Light theme** — Pitch black dark theme, persisted across sessions, 30+ CSS custom properties for consistent theming
- **Fully offline** — Works without internet after first load (PWA)
- **Installable** — Add to home screen on mobile or desktop
- **Responsive** — Three breakpoints (880px, 760px, 480px) with collapsible sidebar, stacked layouts, and full-width dropdowns on small screens
- **Search** — Global search across all transactions
- **Date filters** — Today, this week, this month, this year, all time, or custom range
- **Custom date range picker** — Standalone popover with side-by-side calendars, quick-jump chips (7/30/90 days, YTD), editable text inputs, month grid navigation, range highlighting, and Apply/Cancel
- **Upcoming scheduled banner** — When date range extends past today, shows count of upcoming recurring transactions with link to Scheduled page
- **Transaction date limit** — Manual transactions capped at today (no future dates); future dates only via CSV import
- **Custom dropdowns** — Themed dropdown components replacing native selects across all select elements
- **FAB button** — Floating "New transaction" button for quick access
- **Sticky sidebar** — Sidebar stays visible while scrolling on desktop
- **Transaction modal** — 560px wide with smooth type-switch transitions between Expense/Income/Transfer/Refund
- **WCAG accessible** — 44px touch targets, focus-visible states, proper contrast ratios

---

## Upcoming

- **Google Drive sync** — Sync data across devices using the storage adapter pattern
- **Budgeting** — Set monthly budgets by category and track against spending
- **Multi-file import** — Import from multiple CSV/PDF files simultaneously
- **Transaction splitting** — Split a single transaction across multiple categories
- **Enhanced reports** — Trend analysis, year-over-year comparisons, custom date ranges

---

## Tech Stack

- **HTML/CSS/JS** — Vanilla, no frameworks, no build step
- **PWA** — Service worker for offline caching, web manifest for installability
- **IndexedDB** — Primary storage with localStorage fallback
- **Custom components** — Themed dropdowns, date picker, date range picker, modal system, floating action button
- **Lucide Icons** — Loaded via CDN
- **Manrope** — Google Fonts

---

## Project Structure

```
├── index.html                          # App shell
├── manifest.json                       # PWA manifest
├── sw.js                               # Service worker (network-first for code)
├── css/
│   └── styles.css                      # All styles (theme tokens, components, layout)
├── js/
│   ├── constants.js                    # Config, currencies, auto-categorization keywords, owner list
│   ├── utils.js                        # Helpers, lookups, balance computation, reconciliation helpers
│   ├── store.js                        # Data model, 21+ centralized mutations, normalizeData migrations
│   ├── modals.js                       # Modal stack system + utility modals
│   ├── modals/
│   │   └── entity-modals.js            # Transaction/Account/Refund/Link/Reconciliation modals
│   ├── components/
│   │   ├── transaction-row.js          # Shared transaction row renderer
│   │   ├── custom-dropdown.js          # Themed dropdown component
│   │   ├── date-picker.js              # Custom date picker (max-date support)
│   │   └── date-range-picker.js        # Standalone range picker with side-by-side calendars
│   ├── pages/
│   │   ├── overview.js                 # Dashboard with balance + reconciliation banner + upcoming bills
│   │   ├── register.js                 # Transaction log with cascading filters + year/month grouping
│   │   ├── accounts.js                 # Owner-grouped card tiles with kebab menu
│   │   ├── people.js                   # Payees with debt tracking
│   │   ├── reports.js                  # Spending breakdown charts (4 tabs)
│   │   ├── recurring.js                # Scheduled transactions with categories + auto-post
│   │   ├── categories.js               # Tabbed categories with collapsible subcategories
│   │   └── settings.js                 # Backup, import, reset
│   ├── services/
│   │   ├── storage.js                  # IndexedDB adapter with localStorage migration
│   │   ├── backup.js                   # JSON/CSV export + restore
│   │   ├── csv-import.js               # CSV parser with column mapping
│   │   └── import-preview.js           # Statement text parser + review UI
│   └── app.js                          # Entry point: nav, router, events, theme, auto-post recurring
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
└── README.md
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

The data layer uses a centralized store pattern (`js/store.js`) with 21+ mutation functions that handle all writes to the database. Every mutation dual-writes to both IndexedDB and localStorage. A `normalizeData()` function runs schema migrations on both storage backends at boot, ensuring fields added in later versions (e.g., `owner`, `category`, `postMode`) are backfilled on existing records.

---

## License

Private project.
