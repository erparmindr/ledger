import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   store.js
   ============================================================ */
describe("defaultData", () => {
  it("returns object with all required keys", () => {
    const d = L.defaultData();
    expect(d).toHaveProperty("accounts");
    expect(d).toHaveProperty("people");
    expect(d).toHaveProperty("transactions");
    expect(d).toHaveProperty("categories");
    expect(d).toHaveProperty("recurring");
    expect(d).toHaveProperty("debtItems");
    expect(d).toHaveProperty("categoryLearning");
    expect(d).toHaveProperty("subcategoryLearning");
    expect(d).toHaveProperty("groups");
  });
  it("default accounts have required fields", () => {
    const d = L.defaultData();
    d.accounts.forEach(a => {
      expect(a).toHaveProperty("id");
      expect(a).toHaveProperty("name");
      expect(a).toHaveProperty("type");
      expect(a).toHaveProperty("currency");
    });
  });
  it("default categories include expense, income, transfer types", () => {
    const d = L.defaultData();
    const types = new Set(d.categories.map(c => c.type));
    expect(types.has("expense")).toBe(true);
    expect(types.has("income")).toBe(true);
    expect(types.has("transfer")).toBe(true);
  });
});

describe("normalizeData", () => {
  it("returns defaults for null input", () => {
    const d = L.normalizeData(null);
    expect(d.accounts.length).toBeGreaterThan(0);
  });
  it("backfills missing fields on accounts", () => {
    const input = { accounts: [{ id: "a1", name: "Test", type: "checking", currency: "USD" }] };
    const d = L.normalizeData(input);
    expect(d.accounts[0].reconciledBalance).toBeNull();
    expect(d.accounts[0].reconciledAt).toBeNull();
    expect(d.accounts[0].owner).toBe("");
  });
  it("backfills missing fields on recurring", () => {
    const input = { recurring: [{ id: "r1", name: "Rent", amount: 1000 }] };
    const d = L.normalizeData(input);
    expect(d.recurring[0].frequency).toBe("monthly");
    expect(d.recurring[0].category).toBe("");
    expect(d.recurring[0].subcategory).toBe("");
    expect(d.recurring[0].postMode).toBe("review");
  });
  it("preserves categoryLearning", () => {
    const input = { categoryLearning: { "starbucks": "cat1" } };
    const d = L.normalizeData(input);
    expect(d.categoryLearning.starbucks).toBe("cat1");
  });
  it("preserves subcategoryLearning", () => {
    const input = { subcategoryLearning: { "starbucks": { catId: "c1", subId: "s1" } } };
    const d = L.normalizeData(input);
    expect(d.subcategoryLearning.starbucks.catId).toBe("c1");
  });
  it("adds type='expense' to categories missing type", () => {
    const input = { categories: [{ id: "c1", name: "Food", subs: [] }] };
    const d = L.normalizeData(input);
    expect(d.categories[0].type).toBe("expense");
  });
});

/* ============================================================
   backup.js — validateBackup
   ============================================================ */
describe("validateBackup", () => {
  it("rejects non-object input", () => {
    const r = L.validateBackup(null);
    expect(r.valid).toBe(false);
  });
  it("rejects missing accounts array", () => {
    const r = L.validateBackup({ transactions: [], categories: [] });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("accepts valid backup", () => {
    const data = {
      accounts: [{ id: "a1", name: "Checking", type: "checking", currency: "USD" }],
      transactions: [{ id: "t1", type: "expense", date: "2026-07-15", amount: 42.5, desc: "Test" }],
      categories: [{ id: "c1", name: "Food", type: "expense" }],
    };
    const r = L.validateBackup(data);
    expect(r.valid).toBe(true);
    expect(r.stats.accounts).toBe(1);
    expect(r.stats.transactions).toBe(1);
  });
  it("warns on account missing required fields", () => {
    const data = {
      accounts: [{ id: "a1" }],
      transactions: [],
      categories: [],
    };
    const r = L.validateBackup(data);
    expect(r.warnings.some(w => w.includes("missing id, name, or type"))).toBe(true);
  });
  it("warns on transaction with bad date format", () => {
    const data = {
      accounts: [],
      transactions: [{ id: "t1", type: "expense", date: "07/15/2026", amount: 42.5 }],
      categories: [],
    };
    const r = L.validateBackup(data);
    expect(r.warnings.some(w => w.includes("non-ISO date"))).toBe(true);
  });
  it("warns on NaN amount", () => {
    const data = {
      accounts: [],
      transactions: [{ id: "t1", type: "expense", date: "2026-07-15", amount: NaN }],
      categories: [],
    };
    const r = L.validateBackup(data);
    expect(r.warnings.some(w => w.includes("invalid amount"))).toBe(true);
  });
  it("warns on duplicate transaction IDs", () => {
    const data = {
      accounts: [],
      transactions: [
        { id: "t1", type: "expense", date: "2026-07-15", amount: 10 },
        { id: "t1", type: "expense", date: "2026-07-15", amount: 20 },
      ],
      categories: [],
    };
    const r = L.validateBackup(data);
    expect(r.warnings.some(w => w.includes("Duplicate transaction ID"))).toBe(true);
  });
  it("counts stats correctly", () => {
    const data = {
      accounts: [{ id: "a1", name: "A", type: "checking", currency: "USD" }, { id: "a2", name: "B", type: "savings", currency: "CAD" }],
      transactions: [{ id: "t1", type: "expense", date: "2026-07-15", amount: 10 }, { id: "t2", type: "income", date: "2026-07-15", amount: 100 }],
      categories: [{ id: "c1", name: "Food" }, { id: "c2", name: "Salary" }, { id: "c3", name: "Transfer" }],
    };
    const r = L.validateBackup(data);
    expect(r.stats.accounts).toBe(2);
    expect(r.stats.transactions).toBe(2);
    expect(r.stats.categories).toBe(3);
  });
});

/* ============================================================
   recurring.js
   ============================================================ */
describe("_advanceRecurring", () => {
  let origTodayISO;
  beforeAll(() => { origTodayISO = L.todayISO; L.todayISO = () => "2026-07-26"; });
  afterAll(() => { L.todayISO = origTodayISO; });

  it("advances monthly by 1 month", () => {
    const r = { frequency: "monthly", startDate: "2026-06-15" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-15");
  });
  it("advances weekly by 7 days from past date", () => {
    const r = { frequency: "weekly", startDate: "2026-07-20" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-27");
  });
  it("advances biweekly by 14 days from past date", () => {
    const r = { frequency: "biweekly", startDate: "2026-07-13" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-27");
  });
  it("skips past dates for weekly", () => {
    const r = { frequency: "weekly", startDate: "2026-01-01" };
    L._advanceRecurring(r);
    const d = new Date(r.startDate + "T00:00:00");
    expect(d > new Date("2026-07-26T00:00:00")).toBe(true);
  });
});
