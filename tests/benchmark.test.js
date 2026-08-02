import { describe, it, expect, beforeAll } from "vitest";
import { loadLedgerFull } from "./helpers/load-ledger-full.js";

/* ============================================================
   BENCHMARK — large-dataset render and filter timings.
   These are generous budgets meant to catch pathological
   regressions, not micro-benchmarks. Timings are logged so the
   readiness report can cite real numbers.
   ============================================================ */

let L;
beforeAll(() => { L = loadLedgerFull(); });

function buildDataset(txCount) {
  const base = L.generateDemoData();
  const txs = base.transactions.slice();
  const extra = [];
  for (let i = 0; i < txCount - txs.length; i++) {
    const date = "2026-" + String((i % 12) + 1).padStart(2, "0") + "-" + String((i % 27) + 1).padStart(2, "0");
    extra.push({
      id: "bench-tx-" + i,
      type: i % 5 === 0 ? "income" : "expense",
      date: date,
      amount: Math.round(Math.random() * 20000) / 100 || 5,
      desc: "Benchmark merchant " + (i % 40),
      notes: "",
      account: base.accounts[i % base.accounts.length].id,
      category: base.categories[i % base.categories.length].id,
      subcategory: "",
      created: Date.now()
    });
  }
  return Object.assign({}, base, { transactions: txs.concat(extra) });
}

function timed(label, fn) {
  const t0 = performance.now();
  const out = fn();
  const dt = performance.now() - t0;
  console.log("[bench] " + label + ": " + dt.toFixed(1) + "ms");
  return { out: out, dt: dt };
}

describe("Benchmark: rendering with 5000 transactions", () => {
  it("renders every page within interactive budgets", () => {
    L.saveData = function(){};
    L.DB = buildDataset(5000);
    const pages = {
      overview: () => L.pages.renderOverviewPage(),
      transactions: () => L.pages.renderTransactionsPage(),
      reports: () => L.pages.renderReportsPage(),
      accounts: () => L.pages.renderAccountsPage(),
      people: () => L.pages.renderPeoplePage(),
      recurring: () => L.pages.renderRecurringPage(),
      categories: () => L.pages.renderCategoriesPage(),
      settings: () => L.pages.renderSettingsPage()
    };
    Object.keys(pages).forEach(function (name) {
      const r = timed("render " + name, pages[name]);
      expect(typeof r.out).toBe("string");
      expect(r.out.length).toBeGreaterThan(0);
      expect(r.dt).toBeLessThan(3000);
    });
  });

  it("renders 5000 individual transaction rows within budget", () => {
    const rows = timed("renderTxRow x5000", function () {
      let out = "";
      L.DB.transactions.forEach(function (t) { out += L.renderTxRow(t, { tableLayout: true }); });
      return out;
    });
    expect(rows.dt).toBeLessThan(6000);
  });
});

describe("Benchmark: search and filters with 5000 transactions", () => {
  it("searches, filters, and sorts within budget", () => {
    L.registerFilters = L.registerFilters || {};
    const budget = { search: 800, account: 800, sorted: 800 };
    const accountId = L.DB.accounts[0].id;

    L.registerFilters.search = "Benchmark merchant 3";
    const s = timed("search filter", function () { return L.filteredTransactions(); });
    expect(s.out.length).toBeGreaterThan(0);
    expect(s.dt).toBeLessThan(budget.search);

    L.registerFilters.search = "";
    L.registerFilters.account = accountId;
    const a = timed("account filter", function () { return L.filteredTransactions(); });
    expect(a.out.length).toBeGreaterThan(0);
    expect(a.dt).toBeLessThan(budget.account);

    L.registerFilters.account = "all";
    const so = timed("sorted newest-first", function () {
      return L.filteredTransactions().slice().sort(function (x, y) { return (y.date + y.id).localeCompare(x.date + x.id); });
    });
    expect(so.out.length).toBe(5000);
    expect(so.dt).toBeLessThan(budget.sorted);
  });
});
