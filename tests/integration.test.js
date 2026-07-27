import { describe, it, expect, beforeAll, vi } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   Helper: stub renderPage so mutation functions don't crash
   ============================================================ */
function stubRender() {
  L._origRenderPage = L.renderPage;
  L.renderPage = function () {};
  L.renderNav = function () {};
  L.wirePageEvents = function () {};
  L.refreshIcons = function () {};
  L.initCustomDropdowns = function () {};
  L.showToast = function () {};
  L.saveData = function () {};
}
function unstubRender() {
  if (L._origRenderPage) {
    L.renderPage = L._origRenderPage;
    delete L._origRenderPage;
  }
}

/* ============================================================
   Bulk data factories
   ============================================================ */
function seedAccounts() {
  return [
    { id:"a1", name:"Checking", type:"checking", currency:"USD", owner:"me", group:"default", archived:false, openingBalance:0, created:Date.now() },
    { id:"a2", name:"Savings", type:"savings", currency:"USD", owner:"me", group:"default", archived:false, openingBalance:0, created:Date.now() },
    { id:"a3", name:"Credit Card", type:"credit_card", currency:"USD", owner:"me", group:"default", archived:false, openingBalance:0, created:Date.now() },
    { id:"a4", name:"JPY Account", type:"checking", currency:"JPY", owner:"me", group:"default", archived:false, openingBalance:0, created:Date.now() },
    { id:"a5", name:"Partner Checking", type:"checking", currency:"USD", owner:"partner", group:"default", archived:false, openingBalance:0, created:Date.now() },
  ];
}

function seedCategories() {
  return [
    { id:"c1", name:"Food & Dining", type:"expense", subs:[{id:"s1",name:"Restaurants"},{id:"s2",name:"Groceries"}] },
    { id:"c2", name:"Transport", type:"expense", subs:[{id:"s3",name:"Gas"},{id:"s4",name:"Public Transit"}] },
    { id:"c3", name:"Rent", type:"expense", subs:[] },
    { id:"c4", name:"Utilities", type:"expense", subs:[{id:"s5",name:"Electric"},{id:"s6",name:"Internet"}] },
    { id:"c5", name:"Salary", type:"income", subs:[{id:"s7",name:"Primary"},{id:"s8",name:"Bonus"}] },
    { id:"c6", name:"Freelance", type:"income", subs:[] },
    { id:"c7", name:"Transfer", type:"transfer", subs:[] },
  ];
}

function seedPeople() {
  return [
    { id:"p1", name:"Alice", currency:"USD", created:Date.now() },
    { id:"p2", name:"Bob", currency:"USD", created:Date.now() },
  ];
}

/* Generate N transactions with predictable math */
function generateTransactions(n) {
  const txs = [];
  let dayCounter = 1;
  for (let i = 0; i < n; i++) {
    const type = i % 5 === 0 ? "income" : i % 7 === 0 ? "refund" : "expense";
    const acct = i % 3 === 0 ? "a2" : i % 4 === 0 ? "a3" : "a1";
    const cat = type === "income" ? (i % 2 === 0 ? "c5" : "c6") : (i % 3 === 0 ? "c1" : i % 3 === 1 ? "c2" : "c3");
    const sub = cat === "c1" ? (i % 2 === 0 ? "s1" : "s2") : cat === "c5" ? "s7" : "";
    const amount = ((i % 97) + 1) * 3.14;
    const month = String((i % 12) + 1).padStart(2, "0");
    dayCounter = (dayCounter % 28) + 1;
    const day = String(dayCounter).padStart(2, "0");
    txs.push({
      id: "tx-" + i, type, date: `2025-${month}-${day}`,
      amount: Math.round(amount * 100) / 100,
      desc: type === "income" ? "Paycheck " + i : "Purchase " + i,
      notes: i % 10 === 0 ? "Note for tx " + i : "",
      account: acct, category: cat, subcategory: sub,
      created: Date.now() + i
    });
  }
  return txs;
}

/* ============================================================
   Helper: set up a full DB seed
   ============================================================ */
function seedDB(txCount) {
  const accounts = seedAccounts();
  const categories = seedCategories();
  const people = seedPeople();
  const transactions = generateTransactions(txCount);
  L.DB = { accounts, categories, people, transactions, recurring:[], groups:[], debtItems:[], categoryLearning:{}, subcategoryLearning:{} };
  return { accounts, categories, people, transactions };
}

/* ============================================================
   1. Transaction CRUD at scale
   ============================================================ */
describe("Stress: Transaction CRUD", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("adds 500 transactions and verifies count + first/last", () => {
    seedDB(0);
    for (let i = 0; i < 500; i++) {
      L.addTransaction({ id:"bulk-"+i, type:"expense", date:"2026-01-15", amount:10+i, desc:"Bulk "+i, notes:"", account:"a1", category:"c1", subcategory:"s1", created:Date.now() });
    }
    expect(L.DB.transactions.length).toBe(500);
    expect(L.DB.transactions[0].desc).toBe("Bulk 0");
    expect(L.DB.transactions[499].desc).toBe("Bulk 499");
  });

  it("deletes transaction by id", () => {
    seedDB(100);
    const before = L.DB.transactions.length;
    L.deleteTransaction("tx-50");
    expect(L.DB.transactions.length).toBe(before - 1);
    expect(L.DB.transactions.find(t => t.id === "tx-50")).toBeUndefined();
  });

  it("updates transaction fields", () => {
    seedDB(50);
    L.updateTransaction("tx-10", { desc: "Updated!", amount: 999.99 });
    const tx = L.DB.transactions.find(t => t.id === "tx-10");
    expect(tx.desc).toBe("Updated!");
    expect(tx.amount).toBe(999.99);
  });
});

/* ============================================================
   2. Account balance math
   ============================================================ */
describe("Stress: Account balance correctness", () => {
  it("computes correct balance: income - expenses for a1", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"b1", type:"income", date:"2026-01-01", amount:5000, desc:"Salary", notes:"", account:"a1", category:"c5", subcategory:"s7", created:Date.now() },
      { id:"b2", type:"expense", date:"2026-01-02", amount:1200, desc:"Rent", notes:"", account:"a1", category:"c3", subcategory:"", created:Date.now() },
      { id:"b3", type:"expense", date:"2026-01-03", amount:350, desc:"Groceries", notes:"", account:"a1", category:"c1", subcategory:"s2", created:Date.now() },
      { id:"b4", type:"expense", date:"2026-01-04", amount:80, desc:"Gas", notes:"", account:"a1", category:"c2", subcategory:"s3", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(3370);
  });

  it("credit card balance is negative of spending", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"cc1", type:"expense", date:"2026-01-01", amount:200, desc:"CC purchase", notes:"", account:"a3", category:"c1", subcategory:"", created:Date.now() },
      { id:"cc2", type:"expense", date:"2026-01-02", amount:150, desc:"CC purchase 2", notes:"", account:"a3", category:"c2", subcategory:"", created:Date.now() },
    ];
    const bal = L.accountBalance("a3");
    expect(bal).toBe(-350);
  });

  it("JPY account uses 0 decimal places", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"jpy1", type:"income", date:"2026-01-01", amount:100000, desc:"JPY salary", notes:"", account:"a4", category:"c5", subcategory:"", created:Date.now() },
      { id:"jpy2", type:"expense", date:"2026-01-02", amount:50000, desc:"JPY rent", notes:"", account:"a4", category:"c3", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a4")).toBe(50000);
    const formatted = L.fmtMoney(50000, "JPY");
    expect(formatted).not.toContain(".");
  });
});

/* ============================================================
   3. Category totals / breakdown
   ============================================================ */
describe("Stress: Category math", () => {
  it("accountBreakdown sums income vs expense correctly", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"bk1", type:"income", date:"2026-01-01", amount:3000, desc:"Salary", notes:"", account:"a1", category:"c5", subcategory:"", created:Date.now() },
      { id:"bk2", type:"expense", date:"2026-01-02", amount:800, desc:"Rent", notes:"", account:"a1", category:"c3", subcategory:"", created:Date.now() },
      { id:"bk3", type:"expense", date:"2026-01-03", amount:200, desc:"Food", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
      { id:"bk4", type:"income", date:"2026-01-04", amount:500, desc:"Freelance", notes:"", account:"a1", category:"c6", subcategory:"", created:Date.now() },
    ];
    const bd = L.accountBreakdown("a1");
    expect(bd.income).toBe(3500);
    expect(bd.expense).toBe(1000);
    expect(bd.computed).toBe(2500);
  });

  it("categoryName resolves all category ids", () => {
    seedDB(0);
    expect(L.categoryName("c1")).toBe("Food & Dining");
    expect(L.categoryName("c5")).toBe("Salary");
    expect(L.categoryName("nonexistent")).toBe("Uncategorized");
  });

  it("subcatName resolves subcategories", () => {
    seedDB(0);
    expect(L.subcatName("c1", "s1")).toBe("Restaurants");
    expect(L.subcatName("c1", "s2")).toBe("Groceries");
    expect(L.subcatName("c5", "s7")).toBe("Primary");
    expect(L.subcatName("c1", "nonexistent")).toBe("");
  });
});

/* ============================================================
   4. Transfer logic (manual linked rows since commitLinkedTransferPair
      lives in tx-modals.js which is not loaded by the test helper)
   ============================================================ */
describe("Stress: Transfers", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("linked transfer creates two rows with correct accounts and amounts", () => {
    seedDB(0);
    const linkId = L.uid();
    const rows = [
      { id:L.uid(), type:"expense", date:"2026-06-15", amount:1000, desc:"Transfer → Savings", notes:"", account:"a1", category:"c7", subcategory:"", linkId, linkRole:"out", linkCurrency:"USD", created:Date.now() },
      { id:L.uid(), type:"income", date:"2026-06-15", amount:950, desc:"Transfer ← Checking", notes:"", account:"a2", category:"c7", subcategory:"", linkId, linkRole:"in", linkCurrency:"USD", created:Date.now() },
    ];
    L.addTransactionBatch(rows);
    const linked = L.DB.transactions.filter(t => t.linkId === linkId);
    expect(linked.length).toBe(2);
    const outRow = linked.find(t => t.linkRole === "out");
    expect(outRow.account).toBe("a1");
    expect(outRow.amount).toBe(1000);
    expect(outRow.type).toBe("expense");
    const inRow = linked.find(t => t.linkRole === "in");
    expect(inRow.account).toBe("a2");
    expect(inRow.amount).toBe(950);
    expect(inRow.type).toBe("income");
  });

  it("deleting by linkId removes both rows", () => {
    seedDB(0);
    const linkId = L.uid();
    L.addTransactionBatch([
      { id:L.uid(), type:"expense", date:"2026-06-15", amount:500, desc:"Linked out", notes:"", account:"a1", category:"c7", subcategory:"", linkId, linkRole:"out", created:Date.now() },
      { id:L.uid(), type:"income", date:"2026-06-15", amount:480, desc:"Linked in", notes:"", account:"a2", category:"c7", subcategory:"", linkId, linkRole:"in", created:Date.now() },
    ]);
    expect(L.DB.transactions.filter(t => t.linkId === linkId).length).toBe(2);
    L.deleteTransactionsByLink(linkId);
    expect(L.DB.transactions.filter(t => t.linkId === linkId).length).toBe(0);
  });
});

/* ============================================================
   5. Duplicate detection at scale
   ============================================================ */
describe("Stress: Duplicate detection", () => {
  it("finds all duplicate groups in 1000 transactions", () => {
    seedDB(0);
    const base = { type:"expense", date:"2026-03-15", amount:42.50, desc:"Starbucks Coffee", account:"a1" };
    L.DB.transactions.push({ ...base, id:"orig-1", notes:"", category:"c1", subcategory:"s1", created:Date.now() });
    for (let i = 0; i < 9; i++) {
      L.DB.transactions.push({ ...base, id:"dup-1-"+i, notes:"", category:"c1", subcategory:"s1", created:Date.now() + i });
    }
    const base2 = { type:"expense", date:"2026-03-16", amount:15.00, desc:"Uber Ride", account:"a1" };
    L.DB.transactions.push({ ...base2, id:"orig-2", notes:"", category:"c2", subcategory:"s3", created:Date.now() });
    for (let i = 0; i < 4; i++) {
      L.DB.transactions.push({ ...base2, id:"dup-2-"+i, notes:"", category:"c2", subcategory:"s3", created:Date.now() + i });
    }
    for (let i = 0; i < 990; i++) {
      L.DB.transactions.push({ id:"uniq-"+i, type:"expense", date:"2026-01-"+String((i%28)+1).padStart(2,"0"), amount:1+i*0.01, desc:"Unique item "+i, notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() });
    }
    const dupes = L.findAllDuplicates();
    expect(dupes.length).toBeGreaterThanOrEqual(2);
    // Each group is an array of txs; check .length
    const group1 = dupes.find(g => g.length === 10);
    const group2 = dupes.find(g => g.length === 5);
    expect(group1).toBeTruthy();
    expect(group2).toBeTruthy();
  });
});

/* ============================================================
   6. Running balance
   ============================================================ */
describe("Stress: Running balance", () => {
  it("running balance is mathematically correct for sorted transactions", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"rb1", type:"income", date:"2026-01-01", amount:1000, desc:"Income", notes:"", account:"a1", category:"c5", subcategory:"", created:1 },
      { id:"rb2", type:"expense", date:"2026-01-02", amount:300, desc:"Expense 1", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"rb3", type:"expense", date:"2026-01-03", amount:200, desc:"Expense 2", notes:"", account:"a1", category:"c2", subcategory:"", created:3 },
      { id:"rb4", type:"income", date:"2026-01-04", amount:500, desc:"Income 2", notes:"", account:"a1", category:"c6", subcategory:"", created:4 },
      { id:"rb5", type:"expense", date:"2026-01-05", amount:150, desc:"Expense 3", notes:"", account:"a1", category:"c3", subcategory:"", created:5 },
    ];
    let runBal = 0;
    L.DB.transactions.forEach(t => {
      if (t.type === "income" || t.type === "refund") runBal += t.amount;
      else runBal -= t.amount;
    });
    expect(runBal).toBe(850);
    expect(L.accountBalance("a1")).toBe(850);
  });
});

/* ============================================================
   7. Date range filtering
   ============================================================ */
describe("Stress: Date filtering", () => {
  it("filters transactions by date range correctly", () => {
    seedDB(200);
    const from = "2025-03-01";
    const to = "2025-05-31";
    const filtered = L.DB.transactions.filter(t => t.date >= from && t.date <= to);
    filtered.forEach(t => {
      expect(t.date >= from).toBe(true);
      expect(t.date <= to).toBe(true);
    });
    expect(filtered.length).toBeLessThan(200);
    expect(filtered.length).toBeGreaterThan(0);
  });
});

/* ============================================================
   8. Category learning at scale
   ============================================================ */
describe("Stress: Category learning", () => {
  it("learns and recalls 200 category mappings", () => {
    seedDB(0);
    L.DB.categoryLearning = {};
    L.DB.subcategoryLearning = {};
    for (let i = 0; i < 200; i++) {
      const key = L.learnedCategoryKey("Vendor" + i + " Inc");
      L.DB.categoryLearning[key] = "c" + ((i % 6) + 1);
    }
    for (let i = 0; i < 200; i++) {
      const key = L.learnedCategoryKey("Vendor" + i + " Inc");
      expect(L.DB.categoryLearning[key]).toBeTruthy();
      expect(typeof L.DB.categoryLearning[key]).toBe("string");
    }
  });

  it("rankCategorySuggestions returns sorted results", () => {
    seedDB(0);
    const DB = {
      categoryLearning: { "starbucks":"c1", "uber":"c2", "netflix":"c4" },
      subcategoryLearning: { "starbucks":{catId:"c1",subId:"s1"} },
      categories: L.DB.categories,
      transactions: [],
    };
    const findCat = (id) => DB.categories.find(c => c.id === id) || null;
    const results = L.rankCategorySuggestions("starbucks coffee shop", "expense", DB, findCat);
    expect(results.length).toBeGreaterThan(0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
    }
    expect(results[0].id).toBe("c1");
  });
});

/* ============================================================
   9. Backup round-trip integrity
   ============================================================ */
describe("Stress: Backup integrity", () => {
  it("validateBackup passes for 1000 well-formed transactions", () => {
    seedDB(0);
    const accounts = seedAccounts();
    const categories = seedCategories();
    const txs = [];
    for (let i = 0; i < 1000; i++) {
      txs.push({
        id: "round-"+i, type: i%3===0?"income":"expense",
        date: `2026-${String((i%12)+1).padStart(2,"0")}-${String((i%28)+1).padStart(2,"0")}`,
        amount: (i%100)+1, desc: "Round trip "+i, notes: "",
        account: "a1", category: "c1", subcategory: "", created: Date.now()
      });
    }
    const backup = {
      version:1, accounts, categories, transactions:txs,
      people:[], recurring:[], groups:[], debtItems:[],
      categoryLearning:{}, subcategoryLearning:{}
    };
    const result = L.validateBackup(backup);
    expect(result.valid).toBe(true);
    expect(result.stats.transactions).toBe(1000);
    expect(result.warnings.length).toBe(0);
  });

  it("validateBackup catches bad data in large backup", () => {
    seedDB(0);
    const txs = [];
    for (let i = 0; i < 500; i++) {
      const bad = i % 50 === 0;
      txs.push({
        id: bad ? "" : "v-"+i,
        type: "expense",
        date: bad ? "not-a-date" : "2026-01-15",
        amount: bad ? NaN : 10,
        desc: "Validation "+i, notes: "",
        account: "a1", category: "c1", subcategory: "", created: Date.now()
      });
    }
    const backup = {
      version:1, accounts:seedAccounts(), categories:seedCategories(),
      transactions:txs, people:[], recurring:[], groups:[], debtItems:[],
      categoryLearning:{}, subcategoryLearning:{}
    };
    const result = L.validateBackup(backup);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

/* ============================================================
   10. Bulk operations on 500 transactions
   ============================================================ */
describe("Stress: Bulk operations on 500 transactions", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("adds category to 100 transactions via updateTransaction", () => {
    seedDB(500);
    const toUpdate = L.DB.transactions.slice(0, 100);
    toUpdate.forEach(t => {
      L.updateTransaction(t.id, { category: "c1", subcategory: "s2" });
    });
    toUpdate.forEach(t => {
      const tx = L.DB.transactions.find(x => x.id === t.id);
      expect(tx.category).toBe("c1");
      expect(tx.subcategory).toBe("s2");
    });
  });

  it("deletes 200 transactions and verifies remaining count", () => {
    seedDB(500);
    const toDelete = L.DB.transactions.slice(0, 200).map(t => t.id);
    toDelete.forEach(id => L.deleteTransaction(id));
    expect(L.DB.transactions.length).toBe(300);
    toDelete.forEach(id => {
      expect(L.DB.transactions.find(t => t.id === id)).toBeUndefined();
    });
  });

  it("search filters across 500 transactions", () => {
    seedDB(500);
    // Use exact desc match to avoid partial hits like "Paycheck 420"
    const tx42 = L.DB.transactions.find(t => t.id === "tx-42");
    const results = L.DB.transactions.filter(t => t.desc === tx42.desc);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("tx-42");
  });
});

/* ============================================================
   11. fmtMoney correctness at scale
   ============================================================ */
describe("Stress: fmtMoney", () => {
  it("formats USD with 2 decimals", () => {
    expect(L.fmtMoney(1234.5, "USD")).toContain("1,234.50");
  });
  it("formats JPY with 0 decimals", () => {
    expect(L.fmtMoney(1234, "JPY")).not.toContain(".");
  });
  it("handles zero", () => {
    expect(L.fmtMoney(0, "USD")).toContain("0.00");
  });
  it("handles very large amounts", () => {
    const result = L.fmtMoney(999999999.99, "USD");
    expect(result).toContain("999,999,999.99");
  });
  it("handles negative amounts", () => {
    const result = L.fmtMoney(-500.25, "USD");
    expect(result).toContain("500.25");
  });
});

/* ============================================================
   12. normalizeData with edge cases at scale
   ============================================================ */
describe("Stress: normalizeData edge cases", () => {
  it("backfills missing fields on accounts and recurring items", () => {
    const recurring = [
      { id:"r1", desc:"Rent", amount:1200, frequency:"monthly", startDate:"2026-01-01", day:1, nextDueDate:"2026-02-01", fromType:"account", fromId:"a1" },
      { id:"r2", desc:"Netflix", amount:15, frequency:"monthly", startDate:"2026-01-15", day:15, nextDueDate:"2026-02-15" },
    ];
    const data = {
      accounts: seedAccounts().map(a => { delete a.reconciledBalance; delete a.reconciledAt; return a; }),
      categories: seedCategories(),
      transactions: generateTransactions(200),
      people: [], recurring, groups: [], debtItems: [],
      categoryLearning: {}, subcategoryLearning: {}
    };
    const result = L.normalizeData(data);
    // Recurring should get category/subcategory/postMode backfilled
    result.recurring.forEach(r => {
      expect(r.category).toBeDefined();
      expect(r.subcategory).toBeDefined();
      expect(r.postMode).toBeDefined();
    });
    // Accounts should get reconciledBalance/reconciledAt/owner backfilled
    result.accounts.forEach(a => {
      expect(Object.prototype.hasOwnProperty.call(a, "reconciledBalance")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(a, "reconciledAt")).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(a, "owner")).toBe(true);
    });
  });

  it("preserves valid data while fixing broken entries", () => {
    const data = {
      accounts: seedAccounts(),
      categories: [
        { id:"c1", name:"Food", type:"expense", subs:[{id:"s1",name:"Sub"}] },
        { id:"c2", name:"No type" },
      ],
      transactions: [
        { id:"ok-1", type:"expense", date:"2026-01-15", amount:10, desc:"OK", notes:"", account:"a1", category:"c1", subcategory:"s1", created:Date.now() },
      ],
      people: [], recurring: [], groups: [], debtItems: [],
      categoryLearning: { "test":"c1" },
      subcategoryLearning: {}
    };
    const result = L.normalizeData(data);
    expect(result.transactions[0].id).toBe("ok-1");
    const broken = result.categories.find(c => c.id === "c2");
    expect(broken.type).toBe("expense");
    expect(result.categoryLearning["test"]).toBe("c1");
  });
});

/* ============================================================
   13. Multi-account balance consistency
   ============================================================ */
describe("Stress: Multi-account balance consistency", () => {
  it("balances across 5 accounts are all correct", () => {
    seedDB(0);
    const txs = [
      { id:"ma1", type:"income", date:"2026-01-01", amount:5000, desc:"Salary a1", notes:"", account:"a1", category:"c5", subcategory:"", created:1 },
      { id:"ma2", type:"expense", date:"2026-01-02", amount:200, desc:"Food a1", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"ma3", type:"income", date:"2026-01-01", amount:3000, desc:"Savings deposit", notes:"", account:"a2", category:"c5", subcategory:"", created:3 },
      { id:"ma4", type:"expense", date:"2026-01-02", amount:500, desc:"CC payment", notes:"", account:"a3", category:"c3", subcategory:"", created:4 },
      { id:"ma5", type:"income", date:"2026-01-01", amount:500000, desc:"JPY income", notes:"", account:"a4", category:"c5", subcategory:"", created:5 },
      { id:"ma6", type:"expense", date:"2026-01-02", amount:80000, desc:"JPY rent", notes:"", account:"a4", category:"c3", subcategory:"", created:6 },
      { id:"ma7", type:"income", date:"2026-01-01", amount:2000, desc:"Partner salary", notes:"", account:"a5", category:"c5", subcategory:"", created:7 },
      { id:"ma8", type:"expense", date:"2026-01-02", amount:100, desc:"Partner food", notes:"", account:"a5", category:"c1", subcategory:"", created:8 },
    ];
    L.DB.transactions = txs;
    expect(L.accountBalance("a1")).toBe(4800);
    expect(L.accountBalance("a2")).toBe(3000);
    expect(L.accountBalance("a3")).toBe(-500);
    expect(L.accountBalance("a4")).toBe(420000);
    expect(L.accountBalance("a5")).toBe(1900);
  });
});

/* ============================================================
   14. Transaction type distribution
   ============================================================ */
describe("Stress: Transaction type distribution", () => {
  it("correctly counts income, expense, refund across 300 transactions", () => {
    seedDB(300);
    const counts = { income: 0, expense: 0, refund: 0 };
    L.DB.transactions.forEach(t => { if (counts.hasOwnProperty(t.type)) counts[t.type]++; });
    // From generateTransactions: i%5===0 → income, i%7===0 → refund, else expense
    // For i=0..299: income at 0,5,10,...,295 = 60; refund at 7,14,...,294 = ~42; some overlap at 0,35,70,... → ref counts
    expect(counts.income).toBeGreaterThan(0);
    expect(counts.expense).toBeGreaterThan(0);
    expect(counts.refund).toBeGreaterThan(0);
    expect(counts.income + counts.expense + counts.refund).toBe(300);
  });
});

/* ============================================================
   15. Opening balance + transactions = final balance
   ============================================================ */
describe("Stress: Opening balance integration", () => {
  it("accountBalance includes opening balance in total", () => {
    seedDB(0);
    L.DB.accounts.find(a => a.id === "a1").openingBalance = 10000;
    L.DB.transactions = [
      { id:"ob1", type:"income", date:"2026-01-01", amount:5000, desc:"Salary", notes:"", account:"a1", category:"c5", subcategory:"", created:Date.now() },
      { id:"ob2", type:"expense", date:"2026-01-02", amount:3000, desc:"Expenses", notes:"", account:"a1", category:"c3", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(12000); // 10000 + 5000 - 3000
  });
});

/* ============================================================
   16. Refund handling
   ============================================================ */
describe("Stress: Refund handling", () => {
  it("refunds add to account balance like income", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"rf1", type:"expense", date:"2026-01-01", amount:200, desc:"Bought item", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
      { id:"rf2", type:"refund", date:"2026-01-05", amount:200, desc:"Refund for item", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(0);
  });

  it("refunds with different amount than original expense", () => {
    seedDB(0);
    L.DB.transactions = [
      { id:"rf3", type:"expense", date:"2026-01-01", amount:300, desc:"Partial refund item", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
      { id:"rf4", type:"refund", date:"2026-01-05", amount:150, desc:"Partial refund", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(-150); // -300 + 150
  });
});

/* ============================================================
   17. findCategory / hasSubcategories
   ============================================================ */
describe("Stress: Category lookup functions", () => {
  it("findCategory returns correct category objects", () => {
    seedDB(0);
    expect(L.findCategory("c1").name).toBe("Food & Dining");
    expect(L.findCategory("c5").type).toBe("income");
    expect(L.findCategory("nonexistent")).toBeUndefined();
  });

  it("categoryHasSubs returns correct results", () => {
    seedDB(0);
    expect(L.categoryHasSubs("c1")).toBe(true);
    expect(L.categoryHasSubs("c3")).toBe(false);
    expect(L.categoryHasSubs("c5")).toBe(true);
  });
});

/* ============================================================
   18. Bulk search and filter simulation
   ============================================================ */
describe("Stress: Bulk search across 500 txs", () => {
  it("finds all income transactions by type filter", () => {
    seedDB(500);
    const incomes = L.DB.transactions.filter(t => t.type === "income");
    // generateTransactions: i%5===0 → income for i=0..499
    expect(incomes.length).toBe(100); // 0,5,10,...,495
  });

  it("finds all refund transactions by type filter", () => {
    seedDB(500);
    const refunds = L.DB.transactions.filter(t => t.type === "refund");
    // i%7===0 and i%5!==0: 7,14,21,28,42,49,56,63,77,84,91,98,...
    expect(refunds.length).toBeGreaterThan(0);
  });

  it("search by amount finds exact match", () => {
    seedDB(500);
    const target = L.DB.transactions[0].amount;
    const matches = L.DB.transactions.filter(t => t.amount === target);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
