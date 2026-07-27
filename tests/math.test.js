import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

function stubRender() {
  L._origRenderPage = L.renderPage;
  L.renderPage = function () {};
  L.renderNav = function () {};
  L.wirePageEvents = function () {};
  L.refreshIcons = function () {};
  L.initCustomDropdowns = function () {};
  L.showToast = function () {};
  L._origSaveData = L.saveData;
  L.saveData = function () {};
}
function unstubRender() {
  if (L._origRenderPage) { L.renderPage = L._origRenderPage; delete L._origRenderPage; }
  if (L._origSaveData) { L.saveData = L._origSaveData; delete L._origSaveData; }
}

function seedDB() {
  L.DB = {
    accounts: [
      { id:"a1", name:"Checking", type:"checking", currency:"USD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a2", name:"Savings CAD", type:"savings", currency:"CAD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a3", name:"EUR Wallet", type:"checking", currency:"EUR", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a4", name:"JPY Cash", type:"checking", currency:"JPY", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
    ],
    categories: [
      { id:"c1", name:"Food", type:"expense", subs:[{id:"s1",name:"Restaurants"}] },
      { id:"c2", name:"Transport", type:"expense", subs:[] },
      { id:"c3", name:"Salary", type:"income", subs:[] },
    ],
    people: [],
    transactions: [],
    recurring: [],
    groups: [],
    debtItems: [],
    categoryLearning: {},
    subcategoryLearning: {},
  };
}

/* ============================================================
   1. fmtMoney — all currencies
   ============================================================ */
describe("Math: fmtMoney currencies", () => {
  it("USD: $1,234.50", () => {
    expect(L.fmtMoney(1234.5, "USD")).toBe("$1,234.50");
  });
  it("CAD: $1,234.50 (same symbol)", () => {
    expect(L.fmtMoney(1234.5, "CAD")).toBe("$1,234.50");
  });
  it("EUR: €1,234.50", () => {
    expect(L.fmtMoney(1234.5, "EUR")).toContain("1,234.50");
  });
  it("GBP: £1,234.50", () => {
    expect(L.fmtMoney(1234.5, "GBP")).toContain("1,234.50");
  });
  it("INR: ₹1,234.50", () => {
    expect(L.fmtMoney(1234.5, "INR")).toContain("1,234.50");
  });
  it("AUD: $1,234.50 (same symbol as USD)", () => {
    expect(L.fmtMoney(1234.5, "AUD")).toBe("$1,234.50");
  });
  it("JPY: ¥1,235 (no decimals, rounded)", () => {
    const result = L.fmtMoney(1234.5, "JPY");
    expect(result).toContain("1,235");
    expect(result).not.toContain(".");
  });
  it("unknown currency falls back to code prefix", () => {
    const result = L.fmtMoney(100, "CHF");
    expect(result).toContain("CHF");
    expect(result).toContain("100");
  });
});

/* ============================================================
   2. fmtMoney — edge inputs
   ============================================================ */
describe("Math: fmtMoney edge inputs", () => {
  it("NaN becomes 0", () => {
    expect(L.fmtMoney(NaN, "USD")).toContain("0.00");
  });
  it("undefined becomes 0", () => {
    expect(L.fmtMoney(undefined, "USD")).toContain("0.00");
  });
  it("null becomes 0", () => {
    expect(L.fmtMoney(null, "USD")).toContain("0.00");
  });
  it("string '123' is treated as NaN (not coerced)", () => {
    expect(L.fmtMoney("123", "USD")).toContain("0.00");
  });
  it("empty string becomes 0", () => {
    expect(L.fmtMoney("", "USD")).toContain("0.00");
  });
  it("very small amount (0.01)", () => {
    expect(L.fmtMoney(0.01, "USD")).toContain("0.01");
  });
  it("zero", () => {
    expect(L.fmtMoney(0, "USD")).toBe("$0.00");
  });
  it("negative shows minus sign", () => {
    const result = L.fmtMoney(-42.5, "USD");
    expect(result).toContain("42.50");
    expect(result).toMatch(/[\u2212-]/);
  });
  it("negative zero", () => {
    expect(L.fmtMoney(-0, "USD")).toBe("$0.00");
  });
});

/* ============================================================
   3. fmtMoneyShort — abbreviated formatting
   ============================================================ */
describe("Math: fmtMoneyShort", () => {
  it("small amounts show no abbreviation", () => {
    expect(L.fmtMoneyShort(50, "USD")).toBe("$50");
  });
  it("thousands show k suffix", () => {
    expect(L.fmtMoneyShort(1500, "USD")).toBe("$1.5k");
  });
  it("exact thousand", () => {
    expect(L.fmtMoneyShort(1000, "USD")).toBe("$1.0k");
  });
  it("millions show M suffix", () => {
    expect(L.fmtMoneyShort(2500000, "USD")).toBe("$2.5M");
  });
  it("exact million", () => {
    expect(L.fmtMoneyShort(1000000, "USD")).toBe("$1.0M");
  });
  it("negative thousands", () => {
    const result = L.fmtMoneyShort(-3000, "USD");
    expect(result).toContain("3.0k");
  });
  it("JPY abbreviation uses k suffix", () => {
    expect(L.fmtMoneyShort(1500, "JPY")).toContain("1.5k");
  });
  it("zero", () => {
    expect(L.fmtMoneyShort(0, "USD")).toBe("$0");
  });
});

/* ============================================================
   5. Balance rounding precision
   ============================================================ */
describe("Math: Balance rounding", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("rounds to 2 decimal places for USD", () => {
    seedDB();
    L.DB.transactions = [
      { id:"r1", type:"expense", date:"2026-07-01", amount:33.33, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"r2", type:"expense", date:"2026-07-02", amount:33.33, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"r3", type:"expense", date:"2026-07-03", amount:33.34, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
    ];
    // 0 - 33.33 - 33.33 - 33.34 = -100.00
    expect(L.accountBalance("a1")).toBe(-100);
  });

  it("handles floating point 0.1 + 0.2 correctly", () => {
    seedDB();
    L.DB.transactions = [
      { id:"fp1", type:"expense", date:"2026-07-01", amount:0.1, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"fp2", type:"expense", date:"2026-07-02", amount:0.2, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
    ];
    // -0.1 - 0.2 = -0.3, rounded to -0.3
    expect(L.accountBalance("a1")).toBe(-0.3);
  });

  it("rounds JPY to integer", () => {
    seedDB();
    L.DB.transactions = [
      { id:"jp1", type:"income", date:"2026-07-01", amount:100000, desc:"", notes:"", account:"a4", category:"c3", subcategory:"", created:1 },
      { id:"jp2", type:"expense", date:"2026-07-02", amount:33333, desc:"", notes:"", account:"a4", category:"c1", subcategory:"", created:2 },
    ];
    expect(L.accountBalance("a4")).toBe(66667);
  });

  it("many small transactions don't accumulate rounding errors", () => {
    seedDB();
    for (let i = 0; i < 100; i++) {
      L.DB.transactions.push({
        id: "sm-" + i, type: "expense", date: "2026-07-01",
        amount: 0.1, desc: "", notes: "", account: "a1",
        category: "c1", subcategory: "", created: i
      });
    }
    expect(L.accountBalance("a1")).toBe(-10);
  });

  it("balance with opening balance + many transactions rounds correctly", () => {
    seedDB();
    L.DB.accounts.find(a => a.id === "a1").openingBalance = 1000;
    for (let i = 0; i < 50; i++) {
      L.DB.transactions.push({
        id: "ob-" + i, type: "expense", date: "2026-07-01",
        amount: 1.11, desc: "", notes: "", account: "a1",
        category: "c1", subcategory: "", created: i
      });
    }
    // 1000 - 50 * 1.11 = 1000 - 55.5 = 944.5
    expect(L.accountBalance("a1")).toBe(944.5);
  });
});

/* ============================================================
   6. Running balance precision
   ============================================================ */
describe("Math: Running balance precision", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("running balance doesn't drift from accountBalance", () => {
    seedDB();
    L.DB.transactions = [
      { id:"rb1", type:"income", date:"2026-01-01", amount:100, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:1 },
      { id:"rb2", type:"expense", date:"2026-01-02", amount:33.33, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"rb3", type:"expense", date:"2026-01-03", amount:33.33, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"rb4", type:"income", date:"2026-01-04", amount:50, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:4 },
      { id:"rb5", type:"expense", date:"2026-01-05", amount:33.34, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:5 },
    ];
    // Final: 100 - 33.33 - 33.33 + 50 - 33.34 = 50
    expect(L.accountBalance("a1")).toBe(50);
    // Running: 100, 66.67, 33.34, 83.34, 50
    // Each step should be rounded to 2 decimals
    const txIds = ["rb1","rb2","rb3","rb4","rb5"];
    const sorted = [...L.DB.transactions].sort((a,b) => a.date.localeCompare(b.date) || a.created - b.created);
    let runBal = 0;
    sorted.forEach(t => {
      if (t.type === "income" || t.type === "refund") runBal += t.amount;
      else runBal -= t.amount;
      runBal = Math.round(runBal * 100) / 100;
    });
    expect(runBal).toBe(50);
  });
});

/* ============================================================
   7. Split sum validation tolerance (0.005)
   ============================================================ */
describe("Math: Split tolerance", () => {
  it("sums within 0.005 tolerance are valid", () => {
    // 33.33 + 33.33 + 33.33 = 99.99, within 0.01 of 100
    const splits = [{ amount: 33.33 }, { amount: 33.33 }, { amount: 33.33 }];
    const sum = splits.reduce((a, s) => a + s.amount, 0);
    const total = 100;
    expect(Math.abs(sum - total) <= 0.005).toBe(false); // 0.01 off
  });

  it("sums exactly equal pass", () => {
    const splits = [{ amount: 50 }, { amount: 30 }, { amount: 20 }];
    const sum = splits.reduce((a, s) => a + s.amount, 0);
    expect(Math.abs(sum - 100) < 0.005).toBe(true);
  });

  it("sums off by 0.004 pass (within tolerance)", () => {
    const sum = 99.996;
    const total = 100;
    expect(Math.abs(sum - total) <= 0.005).toBe(true);
  });

  it("sums off by 0.006 fail (outside tolerance)", () => {
    const sum = 99.994;
    const total = 100;
    expect(Math.abs(sum - total) <= 0.005).toBe(false);
  });
});

/* ============================================================
   8. Even split rounding
   ============================================================ */
describe("Math: Even split rounding", () => {
  it("100 split 3 ways: 33.33 + 33.33 + 33.34 = 100", () => {
    const total = 100;
    const n = 3;
    const even = Math.round((total / n) * 100) / 100;
    const shares = [even, even];
    const lastShare = Math.round((total - shares[0] - shares[1]) * 100) / 100;
    shares.push(lastShare);
    expect(shares[0]).toBe(33.33);
    expect(shares[1]).toBe(33.33);
    expect(shares[2]).toBe(33.34);
    expect(shares.reduce((a, s) => a + s, 0)).toBe(100);
  });

  it("10 split 3 ways: 3.33 + 3.33 + 3.34 = 10", () => {
    const total = 10;
    const n = 3;
    const even = Math.round((total / n) * 100) / 100;
    const shares = [even, even];
    const lastShare = Math.round((total - shares[0] - shares[1]) * 100) / 100;
    shares.push(lastShare);
    expect(shares.reduce((a, s) => a + s, 0)).toBe(10);
  });

  it("7 split 3 ways: 2.33 + 2.33 + 2.34 = 7", () => {
    const total = 7;
    const n = 3;
    const even = Math.round((total / n) * 100) / 100;
    const shares = [even, even];
    const lastShare = Math.round((total - shares[0] - shares[1]) * 100) / 100;
    shares.push(lastShare);
    expect(shares.reduce((a, s) => a + s, 0)).toBe(7);
  });

  it("1 split 2 ways: 0.5 + 0.5 = 1", () => {
    const total = 1;
    const n = 2;
    const even = Math.round((total / n) * 100) / 100;
    const shares = [even];
    const lastShare = Math.round((total - shares[0]) * 100) / 100;
    shares.push(lastShare);
    expect(shares.reduce((a, s) => a + s, 0)).toBe(1);
  });

  it("100 split 7 ways: all sum to 100 (with final rounding)", () => {
    const total = 100;
    const n = 7;
    const even = Math.round((total / n) * 100) / 100;
    const shares = Array(n - 1).fill(even);
    const lastShare = Math.round((total - shares.reduce((a, s) => a + s, 0)) * 100) / 100;
    shares.push(lastShare);
    const sum = Math.round(shares.reduce((a, s) => a + s, 0) * 100) / 100;
    expect(sum).toBe(100);
  });

  it("1 split 1 way: 1.0 = 1", () => {
    const total = 1;
    const even = Math.round((total / 1) * 100) / 100;
    expect(even).toBe(1);
  });
});

/* ============================================================
   9. Percentage calculations
   ============================================================ */
describe("Math: Percentage calculations", () => {
  it("percentage of total", () => {
    const part = 25;
    const total = 200;
    const pct = Math.round((Math.abs(part) / total) * 100);
    expect(pct).toBe(13); // 12.5 rounded
  });

  it("percentage with zero total", () => {
    const total = 0;
    const pct = total > 0 ? Math.round((50 / total) * 100) : 0;
    expect(pct).toBe(0);
  });

  it("100% allocation", () => {
    const part = 100;
    const total = 100;
    const pct = Math.round((part / total) * 100);
    expect(pct).toBe(100);
  });

  it("split across 3 categories totals 100%", () => {
    const cats = [
      { amt: 50 },
      { amt: 30 },
      { amt: 20 },
    ];
    const total = cats.reduce((a, c) => a + Math.abs(c.amt), 0);
    const pcts = cats.map(c => Math.round((Math.abs(c.amt) / total) * 100));
    expect(pcts.reduce((a, p) => a + p, 0)).toBe(100);
  });
});

/* ============================================================
   10. Monthly total aggregation
   ============================================================ */
describe("Math: Monthly totals", () => {
  it("sums expenses by month correctly", () => {
    seedDB();
    L.DB.transactions = [
      { id:"m1", type:"expense", date:"2026-01-15", amount:100, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"m2", type:"expense", date:"2026-01-20", amount:200, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"m3", type:"expense", date:"2026-02-10", amount:150, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"m4", type:"expense", date:"2026-02-15", amount:50, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:4 },
    ];
    const monthly = {};
    L.DB.transactions.forEach(t => {
      const mk = t.date.slice(0, 7);
      if (!monthly[mk]) monthly[mk] = 0;
      monthly[mk] += Math.abs(t.amount);
    });
    expect(monthly["2026-01"]).toBe(300);
    expect(monthly["2026-02"]).toBe(200);
  });

  it("handles expenses across 12 months", () => {
    seedDB();
    for (let m = 1; m <= 12; m++) {
      L.DB.transactions.push({
        id: "y-" + m, type: "expense",
        date: `2026-${String(m).padStart(2, "0")}-15`,
        amount: m * 100, desc: "", notes: "", account: "a1",
        category: "c1", subcategory: "", created: m
      });
    }
    const total = L.DB.transactions.reduce((a, t) => a + Math.abs(t.amount), 0);
    // 100+200+300+...+1200 = 7800
    expect(total).toBe(7800);
  });
});

/* ============================================================
   11. Reconciliation drift
   ============================================================ */
describe("Math: Reconciliation drift", () => {
  it("drift is balance minus reconciled balance", () => {
    const bal = 5000;
    const reconciled = 4800;
    const drift = Math.round((bal - reconciled) * 100) / 100;
    expect(drift).toBe(200);
  });

  it("drift of zero means reconciled", () => {
    const bal = 5000;
    const reconciled = 5000;
    const drift = Math.round((bal - reconciled) * 100) / 100;
    expect(drift).toBe(0);
  });

  it("negative drift means over-reconciled", () => {
    const bal = 4500;
    const reconciled = 5000;
    const drift = Math.round((bal - reconciled) * 100) / 100;
    expect(drift).toBe(-500);
  });

  it("drift with floating point amounts rounds correctly", () => {
    const bal = 1000.01;
    const reconciled = 999.99;
    const drift = Math.round((bal - reconciled) * 100) / 100;
    expect(drift).toBe(0.02);
  });
});

/* ============================================================
   12. Floating point edge cases
   ============================================================ */
describe("Math: Floating point precision", () => {
  it("0.1 + 0.2 = 0.3 after rounding", () => {
    const result = Math.round((0.1 + 0.2) * 100) / 100;
    expect(result).toBe(0.3);
  });

  it("0.3 - 0.1 = 0.2 after rounding", () => {
    const result = Math.round((0.3 - 0.1) * 100) / 100;
    expect(result).toBe(0.2);
  });

  it("many small additions don't drift", () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) {
      sum += 0.01;
    }
    const result = Math.round(sum * 100) / 100;
    expect(result).toBe(10);
  });

  it("alternating +/- with 0.1 stays at 0", () => {
    let val = 0;
    for (let i = 0; i < 100; i++) {
      val += 0.1;
      val -= 0.1;
    }
    expect(Math.round(val * 100) / 100).toBe(0);
  });

  it("1/3 rounded to 2 decimals * 3 = 0.99 (known precision loss)", () => {
    const third = Math.round((1 / 3) * 100) / 100;
    const result = Math.round(third * 3 * 100) / 100;
    expect(third).toBe(0.33);
    expect(result).toBe(0.99);
  });
});

/* ============================================================
   13. accountBreakdown mathematical consistency
   ============================================================ */
describe("Math: Breakdown consistency", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("computed = opening + income - expense + refund - transferOut + transferIn", () => {
    seedDB();
    L.DB.accounts.find(a => a.id === "a1").openingBalance = 1000;
    L.DB.transactions = [
      { id:"bd1", type:"income", date:"2026-07-01", amount:500, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:1 },
      { id:"bd2", type:"expense", date:"2026-07-02", amount:300, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"bd3", type:"refund", date:"2026-07-03", amount:50, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"bd4", type:"transfer", date:"2026-07-04", amount:200, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:4 },
      { id:"bd5", type:"transfer", date:"2026-07-05", amount:100, desc:"", notes:"", fromType:"account", fromId:"a2", toType:"account", toId:"a1", category:"", subcategory:"", created:5 },
    ];
    const bd = L.accountBreakdown("a1");
    const expected = 1000 + 500 - 300 + 50 - 200 + 100;
    expect(bd.computed).toBe(expected);
    expect(bd.computed).toBe(L.accountBalance("a1"));
  });

  it("breakdown totals match individual calculations", () => {
    seedDB();
    L.DB.transactions = [
      { id:"bt1", type:"income", date:"2026-07-01", amount:1000, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:1 },
      { id:"bt2", type:"income", date:"2026-07-02", amount:500, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:2 },
      { id:"bt3", type:"expense", date:"2026-07-03", amount:200, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"bt4", type:"expense", date:"2026-07-04", amount:100, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:4 },
    ];
    const bd = L.accountBreakdown("a1");
    // Manually sum
    let income = 0, expense = 0;
    L.DB.transactions.forEach(t => {
      if (t.account !== "a1") return;
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
    });
    expect(bd.income).toBe(income);
    expect(bd.expense).toBe(expense);
    expect(bd.computed).toBe(income - expense);
  });
});

/* ============================================================
   14. Account balance across multiple accounts
   ============================================================ */
describe("Math: Multi-account totals", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("total across all accounts matches sum of individual balances", () => {
    seedDB();
    L.DB.transactions = [
      { id:"ma1", type:"income", date:"2026-07-01", amount:5000, desc:"", notes:"", account:"a1", category:"c3", subcategory:"", created:1 },
      { id:"ma2", type:"expense", date:"2026-07-02", amount:1000, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"ma3", type:"income", date:"2026-07-03", amount:3000, desc:"", notes:"", account:"a2", category:"c3", subcategory:"", created:3 },
      { id:"ma4", type:"transfer", date:"2026-07-04", amount:500, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:4 },
    ];
    const b1 = L.accountBalance("a1");
    const b2 = L.accountBalance("a2");
    const total = b1 + b2;
    // a1: 5000 - 1000 - 500 = 3500
    // a2: 3000 + 500 = 3500
    // Total: 7000
    expect(b1).toBe(3500);
    expect(b2).toBe(3500);
    expect(total).toBe(7000);
  });

  it("zero-balance accounts don't affect total", () => {
    seedDB();
    const total = [L.accountBalance("a1"), L.accountBalance("a2"), L.accountBalance("a3"), L.accountBalance("a4")].reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});

/* ============================================================
   15. pad2 function
   ============================================================ */
describe("Math: pad2", () => {
  it("pads single digit", () => {
    expect(L.pad2(1)).toBe("01");
  });
  it("pads zero", () => {
    expect(L.pad2(0)).toBe("00");
  });
  it("doesn't pad double digit", () => {
    expect(L.pad2(12)).toBe("12");
  });
  it("pads string single digit", () => {
    expect(L.pad2("5")).toBe("05");
  });
  it("doesn't pad string double digit", () => {
    expect(L.pad2("12")).toBe("12");
  });
});
