import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   Helpers to generate bulk data
   ============================================================ */
function makeAccounts(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: "acct-" + i, name: "Account " + i, type: i % 3 === 0 ? "credit_card" : "checking",
    currency: "USD", owner: "me", group: "default", archived: false,
    openingBalance: 0, created: Date.now()
  }));
}

function makeCategories(n) {
  const cats = [];
  for (let i = 0; i < n; i++) {
    const cat = { id: "cat-" + i, name: "Category " + i, type: i % 4 === 0 ? "income" : "expense", subs: [] };
    if (i % 3 === 0) cat.subs.push({ id: "sub-" + i + "-0", name: "Sub A" });
    if (i % 3 === 1) cat.subs.push({ id: "sub-" + i + "-0", name: "Sub B" }, { id: "sub-" + i + "-1", name: "Sub C" });
    cats.push(cat);
  }
  return cats;
}

function makeTransactions(n, accounts, categories) {
  const types = ["expense", "income", "refund"];
  return Array.from({ length: n }, (_, i) => {
    const type = types[i % 3];
    const acct = accounts[i % accounts.length];
    const cat = categories[i % categories.length];
    const day = String((i % 28) + 1).padStart(2, "0");
    const month = String((i % 12) + 1).padStart(2, "0");
    return {
      id: "tx-" + i, type, date: `2026-${month}-${day}`,
      amount: Math.round(Math.random() * 10000) / 100 || 1.00,
      desc: "Transaction " + i + " for " + acct.name,
      notes: "", account: acct.id, category: cat.id,
      subcategory: cat.subs.length > 0 ? cat.subs[0].id : "",
      created: Date.now()
    };
  });
}

/* ============================================================
   Stress tests
   ============================================================ */
describe("Stress: normalizeData with large datasets", () => {
  it("normalizes 5000 transactions without error", () => {
    const accounts = makeAccounts(50);
    const categories = makeCategories(100);
    const transactions = makeTransactions(5000, accounts, categories);
    const data = {
      accounts, categories, transactions,
      people: [], recurring: [], groups: [],
      debtItems: [], categoryLearning: {}, subcategoryLearning: {}
    };
    const start = performance.now();
    const result = L.normalizeData(data);
    const elapsed = performance.now() - start;
    expect(result.transactions.length).toBe(5000);
    expect(result.accounts.length).toBe(50);
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("Stress: findDuplicates with many transactions", () => {
  it("finds duplicates in 2000 transactions under 1s", () => {
    const accounts = makeAccounts(10);
    const categories = makeCategories(20);
    // Create 2000 txs, then inject 50 exact duplicates
    const txs = makeTransactions(2000, accounts, categories);
    for (let i = 0; i < 50; i++) {
      txs.push({ ...txs[i], id: "dup-" + i });
    }
    L.DB = L.DB || {};
    L.DB.transactions = txs;
    const start = performance.now();
    const dupes = L.findAllDuplicates();
    const elapsed = performance.now() - start;
    expect(dupes.length).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("Stress: validateBackup with large backup", () => {
  it("validates 5000 transactions under 1s", () => {
    const accounts = makeAccounts(20);
    const categories = makeCategories(50);
    const transactions = makeTransactions(5000, accounts, categories);
    const data = {
      version: 1, accounts, categories, transactions,
      people: [], recurring: [], groups: [],
      debtItems: [], categoryLearning: {}, subcategoryLearning: {}
    };
    const start = performance.now();
    const result = L.validateBackup(data);
    const elapsed = performance.now() - start;
    expect(result.valid).toBe(true);
    expect(result.stats.transactions).toBe(5000);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("Stress: suggestCategoryForDescription with many learned mappings", () => {
  it("handles 500 learned mappings without slowdown", () => {
    const DB = { categoryLearning: {}, subcategoryLearning: {}, categories: makeCategories(50) };
    for (let i = 0; i < 500; i++) {
      DB.categoryLearning["vendor" + i] = "cat-" + (i % 50);
      DB.subcategoryLearning["vendor" + i] = { catId: "cat-" + (i % 50), subId: "sub-" + (i % 50) + "-0" };
    }
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      L.suggestCategoryForDescription("vendor" + (i % 500) + " inc payment", "expense", DB, L.findCategory);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("Stress: accountBalance with many transactions", () => {
  it("computes balance for account with 3000 transactions", () => {
    const accounts = makeAccounts(5);
    const categories = makeCategories(10);
    const txs = [];
    for (let i = 0; i < 3000; i++) {
      txs.push({
        id: "bal-tx-" + i, type: i % 2 === 0 ? "expense" : "income",
        date: "2026-01-01", amount: 10 + (i % 100),
        desc: "Bal test " + i, notes: "", account: "acct-0",
        category: "cat-0", subcategory: "", created: Date.now()
      });
    }
    L.DB = L.DB || {};
    L.DB.accounts = accounts;
    L.DB.transactions = txs;
    const start = performance.now();
    const balance = L.accountBalance("acct-0");
    const elapsed = performance.now() - start;
    expect(typeof balance).toBe("number");
    expect(elapsed).toBeLessThan(500);
  });
});

describe("Stress: autoPostRecurring with many recurring items", () => {
  it("processes 100 recurring items without error", () => {
    const accounts = makeAccounts(5);
    const recurring = [];
    for (let i = 0; i < 100; i++) {
      recurring.push({
        id: "rec-" + i, name: "Recurring " + i, type: "expense",
        amount: 25 + (i % 50), frequency: "monthly",
        startDate: "2025-01-01", account: "acct-" + (i % 5),
        category: "cat-" + (i % 20), subcategory: "",
        postMode: "auto", created: Date.now()
      });
    }
    L.DB = L.DB || {};
    L.DB.accounts = accounts;
    L.DB.transactions = [];
    L.DB.recurring = recurring;
    // Mock saveData and showToast to avoid side effects
    L.saveData = () => {};
    L.showToast = () => {};
    L.renderPage = () => {};
    // Mock nextDueDate (defined in pages/recurring.js, not loaded in tests)
    L.nextDueDate = function(r, today) {
      if (!r.startDate) return today;
      function toISO(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
      if (r.frequency === "weekly") {
        var d = new Date(r.startDate + "T00:00:00");
        d.setDate(d.getDate() + 7);
        return toISO(d);
      }
      if (r.frequency === "biweekly") {
        var d = new Date(r.startDate + "T00:00:00");
        d.setDate(d.getDate() + 14);
        return toISO(d);
      }
      var d2 = new Date(r.startDate + "T00:00:00");
      d2.setMonth(d2.getMonth() + 1);
      return toISO(d2);
    };
    const start = performance.now();
    L.autoPostRecurring();
    const elapsed = performance.now() - start;
    // Should have posted some transactions (monthly from 2025-01-01 to now)
    expect(L.DB.transactions.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("Stress: categoryName/subcatName with 200 categories", () => {
  it("looks up names from 200 categories with subs", () => {
    const cats = makeCategories(200);
    L.DB = L.DB || {};
    L.DB.categories = cats;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      L.categoryName("cat-" + (i % 200));
      if (cats[i % 200].subs.length > 0) {
        L.subcatName("cat-" + (i % 200), cats[i % 200].subs[0].id);
      }
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
