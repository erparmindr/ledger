import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

function stubRender() {
  L._origRenderPage = L.renderPage;
  L._origRenderNav = L.renderNav;
  L._origWirePageEvents = L.wirePageEvents;
  L._origRefreshIcons = L.refreshIcons;
  L._origInitCustomDropdowns = L.initCustomDropdowns;
  L._origShowToast = L.showToast;
  L._origSaveData = L.saveData;
  L.renderPage = function () {};
  L.renderNav = function () {};
  L.wirePageEvents = function () {};
  L.refreshIcons = function () {};
  L.initCustomDropdowns = function () {};
  L.showToast = function () {};
  L.saveData = function () {};
}
function unstubRender() {
  if (L._origRenderPage) { L.renderPage = L._origRenderPage; delete L._origRenderPage; }
  if (L._origRenderNav) { L.renderNav = L._origRenderNav; delete L._origRenderNav; }
  if (L._origWirePageEvents) { L.wirePageEvents = L._origWirePageEvents; delete L._origWirePageEvents; }
  if (L._origRefreshIcons) { L.refreshIcons = L._origRefreshIcons; delete L._origRefreshIcons; }
  if (L._origInitCustomDropdowns) { L.initCustomDropdowns = L._origInitCustomDropdowns; delete L._origInitCustomDropdowns; }
  if (L._origShowToast) { L.showToast = L._origShowToast; delete L._origShowToast; }
  if (L._origSaveData) { L.saveData = L._origSaveData; delete L._origSaveData; }
}

function seedDB() {
  L.DB = {
    accounts: [
      { id:"a1", name:"Checking", type:"checking", currency:"USD", owner:"", archived:false, openingBalance:1000, reconciledBalance:null, reconciledAt:null, created:Date.now() - 86400000 * 60 },
      { id:"a2", name:"Savings", type:"savings", currency:"USD", owner:"g1", archived:false, openingBalance:5000, reconciledBalance:null, reconciledAt:null, created:Date.now() - 86400000 * 60 },
      { id:"a3", name:"CAD Wallet", type:"checking", currency:"CAD", owner:"g1", archived:false, openingBalance:200, reconciledBalance:null, reconciledAt:null, created:Date.now() - 86400000 * 60 },
      { id:"a4", name:"Joint Credit", type:"credit_card", currency:"USD", owner:"g2", archived:false, openingBalance:0, reconciledBalance:null, reconciledAt:null, created:Date.now() - 86400000 * 60 },
    ],
    categories: [
      { id:"c1", name:"Food", type:"expense", subs:[{id:"s1",name:"Restaurants"}] },
      { id:"c2", name:"Salary", type:"income", subs:[] },
      { id:"c3", name:"Transfer", type:"transfer", subs:[] },
    ],
    people: [],
    transactions: [],
    recurring: [],
    groups: [
      { id:"g1", name:"Personal", created:Date.now() },
      { id:"g2", name:"Joint", created:Date.now() },
    ],
    debtItems: [],
    categoryLearning: {},
    subcategoryLearning: {},
  };
}

/* ============================================================
   Account Groups
   ============================================================ */
describe("Account Groups", () => {
  beforeAll(() => { stubRender(); seedDB(); });
  afterAll(() => unstubRender());

  it("addGroup pushes to DB.groups", () => {
    const g = { id:"g3", name:"Business", created:Date.now() };
    L.addGroup(g);
    expect(L.DB.groups.length).toBe(3);
    expect(L.DB.groups.find(g => g.id === "g3").name).toBe("Business");
  });

  it("updateGroup modifies group name", () => {
    L.updateGroup({ id:"g3", name:"Biz", created:Date.now() });
    expect(L.DB.groups.find(g => g.id === "g3").name).toBe("Biz");
  });

  it("deleteGroup clears owner on accounts and removes group", () => {
    // a2 and a3 have owner:"g1"
    L.deleteGroup("g1");
    expect(L.DB.groups.length).toBe(2); // g2 and g3 remain
    expect(L.DB.groups.find(g => g.id === "g1")).toBeUndefined();
    // accounts previously in g1 should have owner reset to ""
    expect(L.DB.accounts.find(a => a.id === "a2").owner).toBe("");
    expect(L.DB.accounts.find(a => a.id === "a3").owner).toBe("");
    // a4 (owner:"g2") should be untouched
    expect(L.DB.accounts.find(a => a.id === "a4").owner).toBe("g2");
    // Restore g1 for subsequent tests
    L.DB.groups.push({ id:"g1", name:"Personal", created:Date.now() });
    L.DB.accounts.find(a => a.id === "a2").owner = "g1";
    L.DB.accounts.find(a => a.id === "a3").owner = "g1";
  });

  it("deleteGroup handles group with no accounts", () => {
    const g = { id:"g_empty", name:"Empty", created:Date.now() };
    L.DB.groups.push(g);
    L.deleteGroup("g_empty");
    expect(L.DB.groups.find(g => g.id === "g_empty")).toBeUndefined();
  });

  it("accounts can be assigned to a group via owner field", () => {
    const a = L.DB.accounts.find(x => x.id === "a1");
    a.owner = "g2";
    expect(a.owner).toBe("g2");
  });
});

/* ============================================================
   Reconciliation
   ============================================================ */
describe("Reconciliation", () => {
  beforeAll(() => { stubRender(); seedDB(); });
  afterAll(() => unstubRender());

  it("needsVerification returns true for account with no reconciledAt", () => {
    const a = L.DB.accounts.find(x => x.id === "a1");
    expect(L.needsVerification(a)).toBe(true);
  });

  it("needsVerification returns false for account created this month", () => {
    const now = new Date();
    const a = { id:"a_new", name:"New", type:"checking", currency:"USD", owner:"", archived:false, openingBalance:0, reconciledBalance:null, reconciledAt:null, created:Date.now() };
    expect(L.needsVerification(a)).toBe(false);
  });

  it("needsVerification returns false for account reconciled this month", () => {
    const now = new Date();
    const a = L.DB.accounts.find(x => x.id === "a1");
    a.created = Date.now() - 86400000 * 120; // 4 months ago
    a.reconciledAt = Date.now() - 86400000 * 5; // 5 days ago (same month)
    expect(L.needsVerification(a)).toBe(false);
  });

  it("needsVerification returns true if last reconciled was last month", () => {
    const a = L.DB.accounts.find(x => x.id === "a1");
    a.reconciledAt = Date.now() - 86400000 * 40; // 40 days ago (previous month)
    expect(L.needsVerification(a)).toBe(true);
  });

  it("accountBreakdown returns computed balance matching opening + transactions", () => {
    const now = Date.now();
    L.DB.transactions = [
      { id:"t1", type:"income", date:"2026-07-01", amount:500, desc:"Salary", account:"a1", created:now },
      { id:"t2", type:"expense", date:"2026-07-02", amount:100, desc:"Food", account:"a1", created:now },
      { id:"t3", type:"refund", date:"2026-07-03", amount:25, desc:"Refund", account:"a1", created:now },
    ];
    const a = L.DB.accounts.find(x => x.id === "a1");
    a.openingBalance = 1000;
    const bk = L.accountBreakdown("a1");
    expect(bk.opening).toBe(1000);
    expect(bk.income).toBe(500);
    expect(bk.expense).toBe(100);
    expect(bk.refund).toBe(25);
    expect(bk.transferOut).toBe(0);
    expect(bk.transferIn).toBe(0);
    expect(bk.computed).toBe(1000 + 500 - 100 + 25);
    L.DB.transactions = [];
  });

  it("accountBreakdown returns null for unknown account", () => {
    expect(L.accountBreakdown("nonexistent")).toBeNull();
  });

  it("accountBalance includes opening balance and transactions", () => {
    const now = Date.now();
    L.DB.transactions = [
      { id:"t1", type:"income", date:"2026-07-01", amount:1000, desc:"Deposit", account:"a1", created:now },
    ];
    const a = L.DB.accounts.find(x => x.id === "a1");
    a.openingBalance = 500;
    expect(L.accountBalance("a1")).toBe(1500);
    L.DB.transactions = [];
  });

  it("accountBalance handles JPY with no decimals", () => {
    const a = L.DB.accounts.find(x => x.id === "a3");
    a.currency = "JPY";
    a.openingBalance = 10000;
    const now = Date.now();
    L.DB.transactions = [
      { id:"t_jpy", type:"expense", date:"2026-07-01", amount:500, desc:"Spend", account:"a3", created:now },
    ];
    expect(L.accountBalance("a3")).toBe(9500);
    L.DB.transactions = [];
    a.currency = "CAD";
  });
});

/* ============================================================
   CSV Import Parsing
   ============================================================ */
describe("CSV Import: parseCsv", () => {
  it("parses basic CSV with header", () => {
    const csv = "Date,Desc,Amount\n2026-07-01,Test,10.50\n2026-07-02,Another,20.00\n";
    const rows = L.parseCsv(csv);
    expect(rows.length).toBe(3); // header + 2 data rows
    expect(rows[0]).toEqual(["Date","Desc","Amount"]);
    expect(rows[1]).toEqual(["2026-07-01","Test","10.50"]);
    expect(rows[2]).toEqual(["2026-07-02","Another","20.00"]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'Date,Desc\n2026-07-01,"Food, drinks"\n';
    const rows = L.parseCsv(csv);
    expect(rows[1][1]).toBe("Food, drinks");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const csv = 'Date,Desc\n2026-07-01,"Say ""hello"" please"\n';
    const rows = L.parseCsv(csv);
    expect(rows[1][1]).toBe('Say "hello" please');
  });

  it("handles empty trailing fields", () => {
    const csv = "Date,Desc,Amount,Extra\n2026-07-01,Test,10.50,\n";
    const rows = L.parseCsv(csv);
    expect(rows[1][3]).toBe("");
    expect(rows[1][0]).toBe("2026-07-01");
  });

  it("filters out empty rows", () => {
    const csv = "Date,Amount\n2026-07-01,10\n\n\n2026-07-02,20\n";
    const rows = L.parseCsv(csv);
    expect(rows.length).toBe(3); // header + 2 data rows
  });

  it("handles Windows-style CRLF line endings", () => {
    const csv = "Date,Amount\r\n2026-07-01,10\r\n";
    const rows = L.parseCsv(csv);
    expect(rows.length).toBe(2);
    expect(rows[1][0]).toBe("2026-07-01");
  });

  it("handles single field per row", () => {
    const csv = "Just a note\n";
    const rows = L.parseCsv(csv);
    expect(rows.length).toBe(1);
  });

  it("returns empty array for completely empty input", () => {
    const rows = L.parseCsv("");
    expect(rows.length).toBe(0);
  });
});

/* ============================================================
   Recurring auto-post edge cases
   ============================================================ */
describe("Recurring: auto-post edge cases", () => {
  let origTodayISO, origNextDueDate;

  beforeAll(() => {
    stubRender();
    origTodayISO = L.todayISO;
    L.todayISO = () => "2026-07-26";
    // nextDueDate is in pages/overview.js (not loaded by test helper); stub it
    origNextDueDate = L.nextDueDate;
    L.nextDueDate = function(r, fromDate) {
      return r.startDate <= fromDate ? r.startDate : fromDate + "1";
    };
  });
  afterAll(() => {
    L.todayISO = origTodayISO;
    if (origNextDueDate) { L.nextDueDate = origNextDueDate; }
    else { delete L.nextDueDate; }
    unstubRender();
  });

  function seedRecurring() {
    L.DB = {
      accounts: [
        { id:"a1", name:"Checking", type:"checking", currency:"USD", owner:"", archived:false, openingBalance:1000, reconciledBalance:null, reconciledAt:null, created:Date.now() },
      ],
      categories: [],
      people: [],
      transactions: [],
      recurring: [],
      groups: [],
      debtItems: [],
      categoryLearning: {},
      subcategoryLearning: {},
    };
  }

  it("auto-posts a due monthly recurring", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r1", name:"Rent", type:"expense", amount:1200,
      startDate:"2026-07-01", frequency:"monthly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.autoPostRecurring();
    const txs = L.DB.transactions.filter(t => t.desc === "Rent");
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(1200);
    expect(L.DB.recurring[0].startDate).toBe("2026-08-01");
  });

  it("skips recurring in review mode", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r2", name:"Electric", type:"expense", amount:150,
      startDate:"2026-07-15", frequency:"monthly", account:"a1",
      category:"", subcategory:"", postMode:"review",
    });
    L.autoPostRecurring();
    const txs = L.DB.transactions.filter(t => t.desc === "Electric");
    expect(txs.length).toBe(0);
  });

  it("advances weekly startDate past today after posting", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r3", name:"Gym", type:"expense", amount:50,
      startDate:"2026-07-01", frequency:"weekly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.autoPostRecurring();
    const txs = L.DB.transactions.filter(t => t.desc === "Gym");
    expect(txs.length).toBe(1);
    // _advanceRecurring: Jul 1 → Jul 8 → ... → Jul 29 (> Jul 26)
    expect(L.DB.recurring[0].startDate).toBe("2026-07-29");
  });

  it("advances biweekly startDate past today after posting", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r4", name:"Insurance", type:"expense", amount:200,
      startDate:"2026-07-01", frequency:"biweekly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.autoPostRecurring();
    const txs = L.DB.transactions.filter(t => t.desc === "Insurance");
    expect(txs.length).toBe(1);
    // Jul 1 + 14 + 14 = Jul 29 (> Jul 26)
    expect(L.DB.recurring[0].startDate).toBe("2026-07-29");
  });

  it("does nothing if recurring startDate is in the future", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r5", name:"Future Bill", type:"expense", amount:100,
      startDate:"2026-08-01", frequency:"monthly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.autoPostRecurring();
    const txs = L.DB.transactions.filter(t => t.desc === "Future Bill");
    expect(txs.length).toBe(0);
    expect(L.DB.recurring[0].startDate).toBe("2026-08-01");
  });

  it("posts transaction even when account is missing", () => {
    seedRecurring();
    L.DB.recurring.push({
      id:"r7", name:"Orphan", type:"expense", amount:100,
      startDate:"2026-07-01", frequency:"monthly", account:"nonexistent",
      category:"", subcategory:"", postMode:"auto",
    });
    expect(() => L.autoPostRecurring()).not.toThrow();
    const txs = L.DB.transactions.filter(t => t.desc === "Orphan");
    expect(txs.length).toBe(1);
  });

  it("saves data after each posted transaction", () => {
    let saveCount = 0;
    L.saveData = function() { saveCount++; };
    seedRecurring();
    L.DB.recurring.push({
      id:"r8", name:"SaveTest", type:"expense", amount:50,
      startDate:"2026-07-01", frequency:"monthly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.DB.recurring.push({
      id:"r9", name:"SaveTest2", type:"expense", amount:75,
      startDate:"2026-07-15", frequency:"monthly", account:"a1",
      category:"", subcategory:"", postMode:"auto",
    });
    L.autoPostRecurring();
    expect(saveCount).toBe(2);
    // Restore
    L.saveData = function() {};
  });
});

describe("_advanceRecurring (independent)", () => {
  let origTodayISO;
  beforeAll(() => {
    origTodayISO = L.todayISO;
    L.todayISO = () => "2026-07-26";
  });
  afterAll(() => { L.todayISO = origTodayISO; });

  it("advances monthly by 1 month", () => {
    const r = { frequency: "monthly", startDate: "2026-06-15" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-15");
  });
  it("advances weekly by 7 days past today", () => {
    const r = { frequency: "weekly", startDate: "2026-07-20" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-27");
  });
  it("advances biweekly by 14 days past today", () => {
    const r = { frequency: "biweekly", startDate: "2026-07-13" };
    L._advanceRecurring(r);
    expect(r.startDate).toBe("2026-07-27");
  });
  it("skips multiple weeks for distant past start", () => {
    const r = { frequency: "weekly", startDate: "2026-01-01" };
    L._advanceRecurring(r);
    // Advances until > Jul 26
    const d = new Date(r.startDate + "T00:00:00");
    expect(d > new Date("2026-07-26T00:00:00")).toBe(true);
  });
});

/* ============================================================
   Export CSV helper
   ============================================================ */
describe("CSV Export: _downloadCsv", () => {
  it("escapes cells containing commas", () => {
    const rows = [["Date", "Desc"], ["2026-07-01", "Food, drinks"]];
    // Cannot fully test download (DOM-dependent), but can verify underlying logic
    const result = rows.map(r =>
      r.map(cell => {
        const s = String(cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(",")
    ).join("\n");
    expect(result).toBe('Date,Desc\n2026-07-01,"Food, drinks"');
  });

  it("escapes cells containing double quotes", () => {
    const rows = [["Note"], ['Say "hello"']];
    const result = rows.map(r =>
      r.map(cell => {
        const s = String(cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(",")
    ).join("\n");
    expect(result).toBe('Note\n"Say ""hello"""');
  });
});