# Ledger — Personal Register

A private, offline-first personal finance ledger. No accounts, no cloud, no tracking — everything stays in your browser.

**Live:** [erparmindr.github.io/ledger](https://erparmindr.github.io/ledger/)

---

## Features

### Core
- **Transaction tracking** — Log expenses, income, and transfers with dates, categories, notes, and amounts
- **Multi-account** — Checking, savings, cash, and credit card accounts with per-account balances
- **Multi-currency** — Supports USD, CAD, EUR, GBP, INR, AUD, JPY with per-account currency selection
- **Running balance** — See your balance update in real-time on the register
- **Recurring items** — Track bills and subscriptions with daily/weekly/monthly/yearly frequency
- **People & contacts** — Track debts owed to/from friends and contacts

### Import & Export
- **CSV import** — Upload bank CSV exports with column mapping
- **Statement text import** — Paste transaction text from PDF bank statements (supports TD Bank and generic formats)
- **Auto-categorization** — Built-in keyword matching for 11 categories (Food, Groceries, Car, Shopping, etc.) plus learned mappings from previous imports
- **Full backup/restore** — Export all data as JSON, restore on any device
- **CSV export** — Export filtered transactions as CSV

### Reports & Insights
- **Spending breakdown** — Visual bar charts by category
- **Monthly/Yearly views** — Toggle between time periods
- **Sidebar balance** — At-a-glance total balance and monthly net income

### UX
- **Dark/Light theme** — Toggle with one click
- **Fully offline** — Works without internet after first load (PWA)
- **Installable** — Add to home screen on mobile or desktop
- **Responsive** — Works on mobile with collapsible sidebar
- **Search** — Global search across all transactions
- **Date filters** — Today, this week, this month, this year, or custom range

---

## Tech Stack

- **HTML/CSS/JS** — Vanilla, no frameworks, no build step
- **PWA** — Service worker for offline caching, web manifest for installability
- **localStorage** — All data stored locally in the browser
- **Lucide Icons** — Loaded via CDN
- **Manrope** — Google Fonts

---

## Project Structure

```
ledger/
├── index.html                          # App shell
├── manifest.json                       # PWA manifest
├── sw.js                               # Service worker
├── css/
│   └── styles.css                      # All styles (theme tokens, components, layout)
├── js/
│   ├── constants.js                    # Config, currencies, auto-categorization keywords
│   ├── utils.js                        # Helpers, lookups, balance computation
│   ├── store.js                        # localStorage persistence, data model
│   ├── modals.js                       # Modal stack system + utility modals
│   ├── modals/
│   │   └── entity-modals.js            # Transaction/Account/Person/Split modals
│   ├── components/
│   │   └── transaction-row.js          # Shared transaction row renderer
│   ├── pages/
│   │   ├── overview.js                 # Dashboard with balance summary
│   │   ├── register.js                 # Transaction log with filters
│   │   ├── accounts.js                 # Account cards with balances
│   │   ├── people.js                   # People/contacts with debt tracking
│   │   ├── reports.js                  # Spending breakdown charts
│   │   ├── recurring.js                # Recurring items management
│   │   └── settings.js                 # Category management, data import/export
│   ├── services/
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

---

## License

Private project.
