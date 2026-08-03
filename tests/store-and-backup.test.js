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
  it("backfills anchorDay on legacy recurring items", () => {
    const input = { recurring: [{ id: "r1", name: "Rent", startDate: "2026-01-31" }] };
    const d = L.normalizeData(input);
    expect(d.recurring[0].anchorDay).toBe(31);
  });
  it("backfills a subs array on categories missing it", () => {
    const input = { categories: [{ id: "c1", name: "Legacy", type: "expense" }] };
    const d = L.normalizeData(input);
    expect(Array.isArray(d.categories[0].subs)).toBe(true);
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
   backup-format.js — versioned wrapper, integrity, migration
   ============================================================ */
describe("sha256hex", () => {
  it("matches the standard SHA-256 test vector for 'abc'", () => {
    expect(L.sha256hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("matches the empty-string vector", () => {
    expect(L.sha256hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("is deterministic", () => {
    expect(L.sha256hex("hello ledger")).toBe(L.sha256hex("hello ledger"));
  });
  it("handles multi-byte (emoji) input", () => {
    expect(L.sha256hex("\u{1F4B8}\u{1F4B0}").length).toBe(64);
  });
});

describe("wrapBackup / unwrapBackup", () => {
  it("wraps a DB snapshot into a versioned backup", () => {
    const db = L.defaultData();
    const w = L.wrapBackup(db, "2026-08-02T00:00:00.000Z");
    expect(w.format).toBe("ledger-backup");
    expect(w.version).toBe(1);
    expect(w.exportedAt).toBe("2026-08-02T00:00:00.000Z");
    expect(w.data).toEqual(db);
    expect(w.data).not.toBe(db); // must be a deep copy (true snapshot)
    expect(typeof w.checksum).toBe("string");
    expect(w.checksum.length).toBe(64);
  });
  it("computes a checksum over the serialized data", () => {
    const db = { accounts: [{ id: "a1", name: "Checking", type: "checking", currency: "USD" }], transactions: [], categories: [] };
    const w = L.wrapBackup(db);
    expect(w.checksum).toBe(L.sha256hex(JSON.stringify(db)));
  });
  it("round-trips through JSON", () => {
    const db = L.generateDemoData();
    const w = L.wrapBackup(db);
    const cloned = JSON.parse(JSON.stringify(w));
    expect(L.unwrapBackup(cloned).version).toBe(1);
    expect(L.unwrapBackup(cloned).isWrapper).toBe(true);
    expect(L.verifyBackupChecksum(cloned)).toBe(true);
  });
  it("detects legacy (unwrapped) backups", () => {
    const legacy = { accounts: [{ id: "a1", name: "A", type: "checking", currency: "USD" }], transactions: [], categories: [] };
    const u = L.unwrapBackup(legacy);
    expect(u.version).toBe(0);
    expect(u.isWrapper).toBe(false);
    expect(u.data).toBe(legacy);
  });
  it("keeps a true snapshot: later DB mutations do not alter the backup or break its checksum", () => {
    const origRender = L.renderPage;
    L.renderPage = () => {};
    try {
      const data = L.generateDemoData();
      L.replaceAllData(data);
      const wrapped = L.wrapBackup(L.DB);
      L.replaceAllData(L.defaultData()); // wipe the live DB AFTER wrapping
      const clone = JSON.parse(JSON.stringify(wrapped));
      expect(clone.data.transactions.length).toBe(data.transactions.length);
      expect(L.verifyBackupChecksum(clone)).toBe(true);
    } finally { L.renderPage = origRender; }
  });
});

describe("verifyBackupChecksum", () => {
  it("returns true for an unmodified backup", () => {
    const db = L.defaultData();
    const w = L.wrapBackup(db);
    expect(L.verifyBackupChecksum(w)).toBe(true);
  });
  it("returns false when data is tampered", () => {
    const db = L.defaultData();
    const w = L.wrapBackup(db);
    w.data.transactions.push({ id: "t-x", type: "expense", date: "2026-08-01", amount: 999, desc: "tampered" });
    expect(L.verifyBackupChecksum(w)).toBe(false);
  });
});

describe("migrateBackup", () => {
  it("returns data unchanged for version 0 -> current (identity)", () => {
    const data = { accounts: [], transactions: [], categories: [] };
    expect(L.migrateBackup(data, 0)).toBe(data);
  });
  it("returns data unchanged for current version -> current", () => {
    const data = { accounts: [], transactions: [], categories: [] };
    expect(L.migrateBackup(data, 1, 1)).toBe(data);
  });
});

describe("backup metadata", () => {
  it("returns null when never backed up", () => {
    L._localStorage.removeItem(L.BACKUP_META_KEY);
    expect(L.getBackupMeta()).toBeNull();
  });
  it("round-trips lastBackupAt + counts", () => {
    L.setBackupMeta({ lastBackupAt: "2026-08-02T10:00:00.000Z", version: 1, counts: { accounts: 2, transactions: 5, categories: 22 } });
    const meta = L.getBackupMeta();
    expect(meta.lastBackupAt).toBe("2026-08-02T10:00:00.000Z");
    expect(meta.counts.transactions).toBe(5);
    L._localStorage.removeItem(L.BACKUP_META_KEY);
  });
});

describe("restoreBackupData (full round-trip)", () => {
  beforeAll(() => {
    const origRender = L.renderPage;
    L.renderPage = () => {};
    const origShow = L.showToast;
    L.showToast = () => {};
  });
  function autoConfirm() {
    const orig = L.openConfirmModal;
    L.openConfirmModal = (t, m, cb) => { if (cb) cb(); };
    return () => { L.openConfirmModal = orig; };
  }
  function snapshotOf() {
    return {
      accounts: L.DB.accounts.slice().sort((a, b) => a.id.localeCompare(b.id)),
      transactions: L.DB.transactions.slice().sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)),
      recurring: L.DB.recurring.slice().sort((a, b) => a.id.localeCompare(b.id)),
      categories: L.DB.categories.slice().sort((a, b) => a.id.localeCompare(b.id)),
      people: L.DB.people.slice(),
      debtItems: L.DB.debtItems.slice().sort((a, b) => a.id.localeCompare(b.id)),
      groups: L.DB.groups.slice(),
    };
  }
  function restoreSnapshot() {
    return {
      accountCount: L.DB.accounts.length,
      txCount: L.DB.transactions.length,
      recurringCount: L.DB.recurring.length,
      balances: L.DB.accounts.map(a => ({ id: a.id, bal: L.accountBalance(a.id) })),
    };
  }

  it("versioned backup round-trips to an identical database (counts + balances + recurring)", () => {
    const data = L.generateDemoData();
    L.replaceAllData(data);
    const before = restoreSnapshot();
    const wrapped = L.wrapBackup(L.DB);
    const restore = autoConfirm();
    try {
      L.replaceAllData(L.defaultData()); // wipe
      expect(L.DB.transactions.length).toBe(0);
      L.restoreBackupData(JSON.parse(JSON.stringify(wrapped)));
      const after = restoreSnapshot();
      expect(after.accountCount).toBe(before.accountCount);
      expect(after.txCount).toBe(before.txCount);
      expect(after.recurringCount).toBe(before.recurringCount);
      expect(after.balances).toEqual(before.balances);
    } finally { restore(); }
  });

  it("legacy (unwrapped) backup still restores", () => {
    const data = L.generateDemoData();
    L.replaceAllData(data);
    const before = restoreSnapshot();
    const legacy = JSON.parse(JSON.stringify(L.DB));
    const restore = autoConfirm();
    try {
      L.replaceAllData(L.defaultData());
      L.restoreBackupData(legacy);
      const after = restoreSnapshot();
      expect(after.txCount).toBe(before.txCount);
      expect(after.accountCount).toBe(before.accountCount);
      expect(after.balances).toEqual(before.balances);
    } finally { restore(); }
  });

  it("blocks backups from a newer version", () => {
    const wrapped = L.wrapBackup(L.DB);
    wrapped.version = 999;
    const toasts = [];
    const origToast = L.showToast;
    L.showToast = (m) => toasts.push(m);
    L.restoreBackupData(wrapped);
    expect(toasts.some(m => m.indexOf("newer version") !== -1)).toBe(true);
    L.showToast = origToast;
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
  it("clamps monthly to month-end preserving the anchor day (Jan 31)", () => {
    const r = { frequency: "monthly", startDate: "2026-01-31", anchorDay: 31 };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-02-28");
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-03-31");
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-04-30");
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-05-31");
  });
  it("clamps monthly anchor on leap-year February (Feb 29)", () => {
    const r = { frequency: "monthly", startDate: "2028-01-31", anchorDay: 31 };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2028-02-29");
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2028-03-31");
  });
  it("rolls monthly over December (anchor day 15)", () => {
    const r = { frequency: "monthly", startDate: "2026-12-15", anchorDay: 15 };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2027-01-15");
  });
  it("falls back to start-date day when anchorDay is absent", () => {
    const r = { frequency: "monthly", startDate: "2026-06-15" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-15");
  });
});
