import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   utils.js
   ============================================================ */
describe("uid", () => {
  it("returns a string", () => {
    expect(typeof L.uid()).toBe("string");
  });
  it("returns unique values", () => {
    const a = L.uid();
    const b = L.uid();
    expect(a).not.toBe(b);
  });
});

describe("pad2", () => {
  it("pads single digit", () => {
    expect(L.pad2(5)).toBe("05");
  });
  it("does not pad double digit", () => {
    expect(L.pad2(12)).toBe("12");
  });
  it("pads string input", () => {
    expect(L.pad2("3")).toBe("03");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(L.escapeHtml("a&b")).toBe("a&amp;b");
  });
  it("escapes angle brackets", () => {
    expect(L.escapeHtml("<script>")).toBe("&lt;script&gt;");
  });
  it("handles null/undefined", () => {
    expect(L.escapeHtml(null)).toBe("");
    expect(L.escapeHtml(undefined)).toBe("");
  });
});

describe("fmtMoney", () => {
  it("formats USD default", () => {
    expect(L.fmtMoney(1234.56)).toContain("1,234.56");
    expect(L.fmtMoney(1234.56)).toContain("$");
  });
  it("formats negative with minus sign", () => {
    const result = L.fmtMoney(-42.5);
    expect(result).toContain("42.50");
    expect(result).toContain("\u2212"); // minus sign
  });
  it("formats JPY without decimals", () => {
    const result = L.fmtMoney(1500, "JPY");
    expect(result).toContain("1,500");
    expect(result).not.toContain("1,500.00");
  });
  it("handles zero", () => {
    expect(L.fmtMoney(0)).toContain("0.00");
  });
  it("handles NaN", () => {
    expect(L.fmtMoney(NaN)).toContain("0.00");
  });
});

describe("fmtMoneyShort", () => {
  it("formats large numbers with k suffix", () => {
    expect(L.fmtMoneyShort(1500)).toContain("1.5k");
  });
  it("formats millions with M suffix", () => {
    expect(L.fmtMoneyShort(2000000)).toContain("2.0M");
  });
  it("formats small numbers without suffix", () => {
    expect(L.fmtMoneyShort(50)).toContain("50");
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = L.todayISO();
    expect(/^\d{4}-\d{2}-\d{2}$/.test(result)).toBe(true);
  });
});

describe("monthKeyOf", () => {
  it("extracts YYYY-MM", () => {
    expect(L.monthKeyOf("2026-07-15")).toBe("2026-07");
  });
});

describe("categoryHasSubs", () => {
  it("returns false for no subs", () => {
    const cat = L.DB.categories.find(c => c.name === "Food" && c.type === "expense");
    if (cat) expect(L.categoryHasSubs(cat.id)).toBe(false);
  });
});

describe("categoryName", () => {
  it("returns category name", () => {
    const cat = L.DB.categories[0];
    expect(L.categoryName(cat.id)).toBe(cat.name);
  });
  it("returns Uncategorized for unknown id", () => {
    expect(L.categoryName("nonexistent")).toBe("Uncategorized");
  });
});

describe("_dupeKey", () => {
  it("generates consistent key for same tx", () => {
    const tx = { date: "2026-07-15", type: "expense", account: "a1", amount: -42.5, desc: "Starbucks Coffee" };
    const k1 = L._dupeKey(tx);
    const k2 = L._dupeKey(tx);
    expect(k1).toBe(k2);
  });
  it("normalizes description", () => {
    const tx1 = { date: "2026-07-15", type: "expense", account: "a1", amount: -42.5, desc: "STARBUCKS  COFFEE" };
    const tx2 = { date: "2026-07-15", type: "expense", account: "a1", amount: -42.5, desc: "starbucks coffee" };
    expect(L._dupeKey(tx1)).toBe(L._dupeKey(tx2));
  });
  it("different dates produce different keys", () => {
    const tx1 = { date: "2026-07-15", type: "expense", account: "a1", amount: -42.5, desc: "test" };
    const tx2 = { date: "2026-07-16", type: "expense", account: "a1", amount: -42.5, desc: "test" };
    expect(L._dupeKey(tx1)).not.toBe(L._dupeKey(tx2));
  });
});

describe("findDuplicates", () => {
  it("finds duplicate transactions in an account", () => {
    L.DB.transactions = [
      { id: "t1", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
      { id: "t2", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
      { id: "t3", date: "2026-07-15", type: "expense", account: "a1", amount: 10.0, desc: "Other" },
    ];
    const dupes = L.findDuplicates("a1");
    expect(dupes.length).toBe(1);
    expect(dupes[0].id).toBe("t1");
    L.DB.transactions = [];
  });

  it("returns empty for no duplicates", () => {
    L.DB.transactions = [
      { id: "t1", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
      { id: "t2", date: "2026-07-15", type: "expense", account: "a1", amount: 10.0, desc: "Other" },
    ];
    expect(L.findDuplicates("a1").length).toBe(0);
    L.DB.transactions = [];
  });
});

describe("findAllDuplicates", () => {
  it("finds groups of duplicates", () => {
    L.DB.transactions = [
      { id: "t1", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
      { id: "t2", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
      { id: "t3", date: "2026-07-16", type: "expense", account: "a1", amount: 10.0, desc: "Lunch" },
      { id: "t4", date: "2026-07-16", type: "expense", account: "a1", amount: 10.0, desc: "Lunch" },
      { id: "t5", date: "2026-07-17", type: "expense", account: "a1", amount: 5.0, desc: "Unique" },
    ];
    const groups = L.findAllDuplicates();
    expect(groups.length).toBe(2);
    L.DB.transactions = [];
  });

  it("returns empty array when no duplicates", () => {
    L.DB.transactions = [
      { id: "t1", date: "2026-07-15", type: "expense", account: "a1", amount: 42.5, desc: "Starbucks" },
    ];
    expect(L.findAllDuplicates().length).toBe(0);
    L.DB.transactions = [];
  });
});
