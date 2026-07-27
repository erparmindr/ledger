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

/* Simulate commitLinkedTransferPair since tx-modals.js isn't loaded in tests */
function simLinkedTransfer(linkId, date, fromAmount, toAmount, desc, notes, fromType, fromId, toType, toId, createdTs, category, subcategory) {
  const fromRef = L.entityRef(fromType, fromId);
  const toRef = L.entityRef(toType, toId);
  const baseDesc = desc || "Transfer";
  category = category || "";
  subcategory = subcategory || "";
  const rows = [];
  if (fromType === "account") {
    rows.push({
      id: L.uid(), type: "expense", date, amount: fromAmount,
      desc: baseDesc + " → " + (toRef ? toRef.name : "?"),
      notes, account: fromId, category, subcategory,
      linkId, linkRole: "out", linkCurrency: toRef ? toRef.currency : "",
      created: createdTs
    });
  }
  if (toType === "account") {
    rows.push({
      id: L.uid(), type: "income", date, amount: toAmount,
      desc: baseDesc + " ← " + (fromRef ? fromRef.name : "?"),
      notes, account: toId, category, subcategory,
      linkId, linkRole: "in", linkCurrency: fromRef ? fromRef.currency : "",
      created: createdTs
    });
  }
  L.deleteTransactionsByLink(linkId);
  L.addTransactionBatch(rows);
}

function seedDB() {
  L.DB = {
    accounts: [
      { id:"a1", name:"Checking", type:"checking", currency:"USD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a2", name:"Savings", type:"savings", currency:"USD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a3", name:"Credit Card", type:"credit_card", currency:"USD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a4", name:"CAD Account", type:"checking", currency:"CAD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a5", name:"EUR Account", type:"checking", currency:"EUR", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a6", name:"JPY Account", type:"checking", currency:"JPY", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
      { id:"a7", name:"Archived Checking", type:"checking", currency:"USD", owner:"", group:"default", archived:true, openingBalance:0, created:Date.now() },
    ],
    categories: [
      { id:"c1", name:"Food", type:"expense", subs:[{id:"s1",name:"Restaurants"}] },
      { id:"c2", name:"Salary", type:"income", subs:[] },
      { id:"c3", name:"Between My Accounts", type:"transfer", subs:[] },
      { id:"c4", name:"To Friend", type:"transfer", subs:[] },
      { id:"c5", name:"Credit Card Payment", type:"transfer", subs:[] },
    ],
    people: [
      { id:"p1", name:"Alice", currency:"USD", created:Date.now() },
      { id:"p2", name:"Bob", currency:"USD", created:Date.now() },
    ],
    transactions: [],
    recurring: [],
    groups: [],
    debtItems: [],
    categoryLearning: {},
    subcategoryLearning: {},
  };
}

/* ============================================================
   1. entityRef resolution
   ============================================================ */
describe("TX Types: entityRef", () => {
  beforeAll(() => { seedDB(); });

  it("resolves account with currency", () => {
    const ref = L.entityRef("account", "a1");
    expect(ref.name).toBe("Checking");
    expect(ref.currency).toBe("USD");
    expect(ref.kind).toBe("account");
  });

  it("resolves CAD account", () => {
    const ref = L.entityRef("account", "a4");
    expect(ref.currency).toBe("CAD");
  });

  it("resolves person without currency", () => {
    const ref = L.entityRef("person", "p1");
    expect(ref.name).toBe("Alice");
    expect(ref.currency).toBeNull();
    expect(ref.kind).toBe("person");
  });

  it("returns null for unknown account", () => {
    expect(L.entityRef("account", "nonexistent")).toBeNull();
  });

  it("returns null for unknown person", () => {
    expect(L.entityRef("person", "nonexistent")).toBeNull();
  });

  it("returns null for unknown type", () => {
    expect(L.entityRef("dog", "a1")).toBeNull();
  });
});

/* ============================================================
   2. Same-currency account-to-account transfers
   ============================================================ */
describe("TX Types: Same-currency transfers", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("creates a single transfer row between two USD accounts", () => {
    seedDB();
    const tx = {
      id:"t1", type:"transfer", date:"2026-07-01", amount:500,
      desc:"Move to savings", notes:"", fromType:"account", fromId:"a1",
      toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].type).toBe("transfer");
    expect(L.DB.transactions[0].fromType).toBe("account");
    expect(L.DB.transactions[0].toType).toBe("account");
  });

  it("subtracts from source and adds to destination", () => {
    seedDB();
    L.DB.transactions.push({
      id:"tr1", type:"transfer", date:"2026-07-01", amount:500,
      desc:"Move to savings", notes:"", fromType:"account", fromId:"a1",
      toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now()
    });
    expect(L.accountBalance("a1")).toBe(-500);
    expect(L.accountBalance("a2")).toBe(500);
  });

  it("multiple transfers accumulate correctly", () => {
    seedDB();
    L.DB.transactions = [
      { id:"mt1", type:"transfer", date:"2026-07-01", amount:1000, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:1 },
      { id:"mt2", type:"transfer", date:"2026-07-02", amount:250, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:2 },
      { id:"mt3", type:"transfer", date:"2026-07-03", amount:100, desc:"", notes:"", fromType:"account", fromId:"a2", toType:"account", toId:"a1", category:"", subcategory:"", created:3 },
    ];
    expect(L.accountBalance("a1")).toBe(-1150); // -1000 - 250 + 100
    expect(L.accountBalance("a2")).toBe(1150);  // +1000 + 250 - 100
  });

  it("transfer between same currency accounts has no linkId", () => {
    seedDB();
    L.DB.transactions = [
      { id:"tr2", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.DB.transactions[0].linkId).toBeUndefined();
  });

  it("transfer with category is stored", () => {
    seedDB();
    L.addTransaction({
      id:"tr3", type:"transfer", date:"2026-07-01", amount:200,
      desc:"CC payment", notes:"", fromType:"account", fromId:"a1",
      toType:"account", toId:"a3", category:"c5", subcategory:"", created:Date.now()
    });
    expect(L.DB.transactions[0].category).toBe("c5");
  });

  it("credit card payment subtracts from checking, adds to credit", () => {
    seedDB();
    L.DB.transactions = [
      { id:"cc1", type:"transfer", date:"2026-07-01", amount:1000, desc:"CC payment", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a3", category:"c5", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(-1000);
    expect(L.accountBalance("a3")).toBe(1000);
  });
});

/* ============================================================
   3. Cross-currency transfers (linked pair)
   ============================================================ */
describe("TX Types: Cross-currency transfers", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("creates two linked rows (expense + income)", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 1000, 950, "Transfer to CAD", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const linked = L.DB.transactions.filter(t => t.linkId === linkId);
    expect(linked.length).toBe(2);
  });

  it("out row is expense from source account", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 1000, 950, "Transfer", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const outRow = L.DB.transactions.find(t => t.linkId === linkId && t.linkRole === "out");
    expect(outRow.type).toBe("expense");
    expect(outRow.amount).toBe(1000);
    expect(outRow.account).toBe("a1");
    expect(outRow.linkCurrency).toBe("CAD");
  });

  it("in row is income to destination account", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 1000, 950, "Transfer", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const inRow = L.DB.transactions.find(t => t.linkId === linkId && t.linkRole === "in");
    expect(inRow.type).toBe("income");
    expect(inRow.amount).toBe(950);
    expect(inRow.account).toBe("a4");
    expect(inRow.linkCurrency).toBe("USD");
  });

  it("source account loses fromAmount, dest gains toAmount", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 1000, 1350, "USD to CAD", "", "account", "a1", "account", "a4", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-1000);
    expect(L.accountBalance("a4")).toBe(1350);
  });

  it("cross-currency USD to EUR", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 500, 460, "USD to EUR", "", "account", "a1", "account", "a5", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-500);
    expect(L.accountBalance("a5")).toBe(460);
  });

  it("cross-currency USD to JPY (different decimal handling)", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 15000, "USD to JPY", "", "account", "a1", "account", "a6", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-100);
    expect(L.accountBalance("a6")).toBe(15000);
  });

  it("linked rows share the same linkId", () => {
    seedDB();
    const linkId = "shared-link-123";
    simLinkedTransfer(linkId, "2026-07-01", 100, 85, "Link test", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const linked = L.DB.transactions.filter(t => t.linkId === linkId);
    expect(linked[0].linkId).toBe(linked[1].linkId);
    expect(linked[0].linkId).toBe(linkId);
  });

  it("out row desc has arrow to destination", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 85, "Wire", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const outRow = L.DB.transactions.find(t => t.linkId === linkId && t.linkRole === "out");
    expect(outRow.desc).toContain("CAD Account");
  });

  it("in row desc has arrow from source", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 85, "Wire", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const inRow = L.DB.transactions.find(t => t.linkId === linkId && t.linkRole === "in");
    expect(inRow.desc).toContain("Checking");
  });

  it("deleteTransactionsByLink removes both rows", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 85, "Del test", "", "account", "a1", "account", "a4", Date.now(), "", "");
    expect(L.DB.transactions.filter(t => t.linkId === linkId).length).toBe(2);
    L.deleteTransactionsByLink(linkId);
    expect(L.DB.transactions.filter(t => t.linkId === linkId).length).toBe(0);
  });

  it("editing linked pair replaces old rows with new", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 85, "Original", "", "account", "a1", "account", "a4", Date.now(), "", "");
    // Edit: change amounts
    simLinkedTransfer(linkId, "2026-07-01", 200, 170, "Updated", "", "account", "a1", "account", "a4", Date.now(), "", "");
    const linked = L.DB.transactions.filter(t => t.linkId === linkId);
    expect(linked.length).toBe(2);
    const outRow = linked.find(t => t.linkRole === "out");
    expect(outRow.amount).toBe(200);
    const inRow = linked.find(t => t.linkRole === "in");
    expect(inRow.amount).toBe(170);
  });

  it("linked pair with category", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 500, 450, "Transfer", "", "account", "a1", "account", "a4", Date.now(), "c3", "");
    const linked = L.DB.transactions.filter(t => t.linkId === linkId);
    linked.forEach(t => expect(t.category).toBe("c3"));
  });
});

/* ============================================================
   4. Person transfers (account ↔ person)
   ============================================================ */
describe("TX Types: Person transfers", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("account → person creates single transfer row", () => {
    seedDB();
    L.addTransaction({
      id:"pt1", type:"transfer", date:"2026-07-01", amount:50,
      desc:"Gift to Alice", notes:"", fromType:"account", fromId:"a1",
      toType:"person", toId:"p1", category:"c4", subcategory:"", created:Date.now()
    });
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].type).toBe("transfer");
    expect(L.DB.transactions[0].fromType).toBe("account");
    expect(L.DB.transactions[0].toType).toBe("person");
  });

  it("account → person subtracts from account", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pt2", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"person", toId:"p1", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(-100);
  });

  it("person → account adds to account", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pt3", type:"transfer", date:"2026-07-01", amount:200, desc:"", notes:"", fromType:"person", fromId:"p1", toType:"account", toId:"a1", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(200);
  });

  it("person balance: gave money = positive (they owe you)", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pb1", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"person", toId:"p1", category:"", subcategory:"", created:Date.now() },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBe(100);
  });

  it("person balance: received money = negative (you owe them)", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pb2", type:"transfer", date:"2026-07-01", amount:75, desc:"", notes:"", fromType:"person", fromId:"p1", toType:"account", toId:"a1", category:"", subcategory:"", created:Date.now() },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBe(-75);
  });

  it("person balance: mixed transfers net out", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pb3", type:"transfer", date:"2026-07-01", amount:200, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"person", toId:"p1", category:"", subcategory:"", created:1 },
      { id:"pb4", type:"transfer", date:"2026-07-02", amount:150, desc:"", notes:"", fromType:"person", fromId:"p1", toType:"account", toId:"a1", category:"", subcategory:"", created:2 },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBe(50); // +200 - 150
  });

  it("person balance includes open debt items", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d1", sourceTransactionId:"tx1", personId:"p1", description:"Dinner", amount:50, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBe(50);
  });

  it("person balance excludes settled debt items", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d2", sourceTransactionId:"tx2", personId:"p1", description:"Old debt", amount:100, currency:"USD", status:"settled", date:"2026-07-01", created:Date.now() },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBeUndefined();
  });

  it("person balance ignores debtItemId transfers (mark paid)", () => {
    seedDB();
    L.DB.transactions = [
      { id:"mp1", type:"transfer", date:"2026-07-01", amount:50, desc:"Repayment", notes:"", fromType:"person", fromId:"p1", toType:"account", toId:"a1", debtItemId:"d3", created:Date.now() },
    ];
    L.DB.debtItems = [
      { id:"d3", sourceTransactionId:"tx3", personId:"p1", description:"Settled", amount:50, currency:"USD", status:"settled", date:"2026-07-01", created:Date.now() },
    ];
    const bal = L.personBalanceByCurrency("p1");
    expect(bal["USD"]).toBeUndefined(); // 0 filtered out
  });

  it("person with no transfers or debts has empty balance", () => {
    seedDB();
    const bal = L.personBalanceByCurrency("p2");
    expect(Object.keys(bal).length).toBe(0);
  });
});

/* ============================================================
   5. Refunds
   ============================================================ */
describe("TX Types: Refunds", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("refund adds to account balance", () => {
    seedDB();
    L.DB.transactions = [
      { id:"rf1", type:"refund", date:"2026-07-01", amount:50, desc:"Returned item", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(50);
  });

  it("linked refund (refundOf) tracks original expense", () => {
    seedDB();
    L.DB.transactions = [
      { id:"exp1", type:"expense", date:"2026-07-01", amount:100, desc:"Bought shoes", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"rf2", type:"refund", date:"2026-07-05", amount:100, desc:"Shoes return", notes:"", account:"a1", category:"c1", subcategory:"", refundOf:"exp1", created:2 },
    ];
    expect(L.accountBalance("a1")).toBe(0); // -100 + 100
  });

  it("partial refund", () => {
    seedDB();
    L.DB.transactions = [
      { id:"exp2", type:"expense", date:"2026-07-01", amount:200, desc:"Item", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"rf3", type:"refund", date:"2026-07-05", amount:50, desc:"Partial return", notes:"", account:"a1", category:"c1", subcategory:"", refundOf:"exp2", created:2 },
    ];
    expect(L.accountBalance("a1")).toBe(-150); // -200 + 50
  });

  it("refund without refundOf is standalone", () => {
    seedDB();
    L.DB.transactions = [
      { id:"rf4", type:"refund", date:"2026-07-01", amount:25, desc:"Cashback", notes:"", account:"a1", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(25);
    expect(L.DB.transactions[0].refundOf).toBeUndefined();
  });

  it("builds refundedIds set correctly for filtering", () => {
    seedDB();
    L.DB.transactions = [
      { id:"expA", type:"expense", date:"2026-07-01", amount:100, desc:"A", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"expB", type:"expense", date:"2026-07-01", amount:200, desc:"B", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"rfA", type:"refund", date:"2026-07-05", amount:100, desc:"Return A", notes:"", account:"a1", category:"c1", subcategory:"", refundOf:"expA", created:3 },
    ];
    const refundedIds = {};
    L.DB.transactions.forEach(tx => {
      if (tx.type === "refund" && tx.refundOf) refundedIds[tx.refundOf] = true;
    });
    expect(refundedIds["expA"]).toBe(true);
    expect(refundedIds["expB"]).toBeUndefined();
  });
});

/* ============================================================
   6. Pending transfers (from CSV import)
   ============================================================ */
describe("TX Types: Pending transfers", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("pending transfer only subtracts from source", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pend1", type:"transfer", date:"2026-07-01", amount:300, desc:"Pending move", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"", pending:true, category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(-300);
    expect(L.accountBalance("a2")).toBe(0);
  });

  it("non-pending transfer credits both sides", () => {
    seedDB();
    L.DB.transactions = [
      { id:"pend2", type:"transfer", date:"2026-07-01", amount:300, desc:"Done move", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.accountBalance("a1")).toBe(-300);
    expect(L.accountBalance("a2")).toBe(300);
  });
});

/* ============================================================
   7. Orphan transfers
   ============================================================ */
describe("TX Types: Orphan transfers", () => {
  it("finds orphan transfers with missing toId", () => {
    seedDB();
    L.DB.transactions = [
      { id:"or1", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"", category:"", subcategory:"", created:Date.now() },
      { id:"or2", type:"transfer", date:"2026-07-01", amount:50, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now() },
    ];
    const orphans = L.findOrphanTransfers("a1");
    expect(orphans.length).toBe(1);
    expect(orphans[0].id).toBe("or1");
  });

  it("finds orphan transfers with missing fromId", () => {
    seedDB();
    L.DB.transactions = [
      { id:"or3", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"", toType:"account", toId:"a1", category:"", subcategory:"", created:Date.now() },
    ];
    const orphans = L.findOrphanTransfers("a1");
    expect(orphans.length).toBe(1);
  });

  it("no orphans returns empty array", () => {
    seedDB();
    L.DB.transactions = [
      { id:"or4", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:Date.now() },
    ];
    expect(L.findOrphanTransfers("a1").length).toBe(0);
  });
});

/* ============================================================
   8. Running balance with transfers
   ============================================================ */
describe("TX Types: Running balance with transfers", () => {
  it("running balance accounts for transfers correctly", () => {
    seedDB();
    L.DB.transactions = [
      { id:"rb1", type:"income", date:"2026-01-01", amount:5000, desc:"Salary", notes:"", account:"a1", category:"c2", subcategory:"", created:1 },
      { id:"rb2", type:"expense", date:"2026-01-02", amount:200, desc:"Food", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"rb3", type:"transfer", date:"2026-01-03", amount:1000, desc:"Move", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:3 },
      { id:"rb4", type:"income", date:"2026-01-04", amount:100, desc:"Refund", notes:"", account:"a1", category:"", subcategory:"", created:4 },
    ];
    // Running: 5000 - 200 - 1000 + 100 = 3900
    expect(L.accountBalance("a1")).toBe(3900);
    // a2: +1000
    expect(L.accountBalance("a2")).toBe(1000);
  });
});

/* ============================================================
   9. Account breakdown with all types
   ============================================================ */
describe("TX Types: Account breakdown", () => {
  it("breakdown sums income, expense, refund, transfers", () => {
    seedDB();
    L.DB.transactions = [
      { id:"bk1", type:"income", date:"2026-07-01", amount:3000, desc:"", notes:"", account:"a1", category:"c2", subcategory:"", created:1 },
      { id:"bk2", type:"expense", date:"2026-07-02", amount:500, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"bk3", type:"refund", date:"2026-07-03", amount:100, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"bk4", type:"transfer", date:"2026-07-04", amount:200, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:4 },
      { id:"bk5", type:"transfer", date:"2026-07-05", amount:300, desc:"", notes:"", fromType:"account", fromId:"a2", toType:"account", toId:"a1", category:"", subcategory:"", created:5 },
    ];
    const bd = L.accountBreakdown("a1");
    expect(bd.income).toBe(3000);
    expect(bd.expense).toBe(500);
    expect(bd.refund).toBe(100);
    expect(bd.transferOut).toBe(200);
    expect(bd.transferIn).toBe(300);
    expect(bd.computed).toBe(2700); // 0 + 3000 - 500 + 100 - 200 + 300
  });
});

/* ============================================================
   10. Mixed transaction types in one account
   ============================================================ */
describe("TX Types: Mixed types in one account", () => {
  it("expense + income + transfer + refund all combine correctly", () => {
    seedDB();
    L.DB.transactions = [
      { id:"mx1", type:"income", date:"2026-07-01", amount:5000, desc:"Paycheck", notes:"", account:"a1", category:"c2", subcategory:"", created:1 },
      { id:"mx2", type:"expense", date:"2026-07-02", amount:1500, desc:"Rent", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"mx3", type:"expense", date:"2026-07-03", amount:300, desc:"Groceries", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"mx4", type:"transfer", date:"2026-07-04", amount:1000, desc:"To savings", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:4 },
      { id:"mx5", type:"refund", date:"2026-07-05", amount:50, desc:"Return", notes:"", account:"a1", category:"c1", subcategory:"", created:5 },
      { id:"mx6", type:"income", date:"2026-07-06", amount:200, desc:"Side gig", notes:"", account:"a1", category:"c2", subcategory:"", created:6 },
      { id:"mx7", type:"expense", date:"2026-07-07", amount:100, desc:"Dinner", notes:"", account:"a1", category:"c1", subcategory:"", created:7 },
    ];
    // 5000 - 1500 - 300 - 1000 + 50 + 200 - 100 = 2350
    expect(L.accountBalance("a1")).toBe(2350);
    // a2: +1000
    expect(L.accountBalance("a2")).toBe(1000);
  });
});

/* ============================================================
   11. Opening balance + all types
   ============================================================ */
describe("TX Types: Opening balance integration", () => {
  it("opening balance + income - expense + refund - transferOut + transferIn", () => {
    seedDB();
    L.DB.accounts.find(a => a.id === "a1").openingBalance = 2000;
    L.DB.transactions = [
      { id:"ob1", type:"income", date:"2026-07-01", amount:1000, desc:"", notes:"", account:"a1", category:"c2", subcategory:"", created:1 },
      { id:"ob2", type:"expense", date:"2026-07-02", amount:500, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:2 },
      { id:"ob3", type:"refund", date:"2026-07-03", amount:100, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:3 },
      { id:"ob4", type:"transfer", date:"2026-07-04", amount:200, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:4 },
    ];
    // 2000 + 1000 - 500 + 100 - 200 = 2400
    expect(L.accountBalance("a1")).toBe(2400);
  });
});

/* ============================================================
   12. Transfer categories
   ============================================================ */
describe("TX Types: Transfer categories", () => {
  it("default transfer categories exist", () => {
    seedDB();
    const transferCats = L.DB.categories.filter(c => c.type === "transfer");
    expect(transferCats.length).toBeGreaterThanOrEqual(3);
    const names = transferCats.map(c => c.name);
    expect(names).toContain("Between My Accounts");
    expect(names).toContain("To Friend");
    expect(names).toContain("Credit Card Payment");
  });

  it("transfer category filter works", () => {
    seedDB();
    L.DB.transactions = [
      { id:"tc1", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"c3", subcategory:"", created:Date.now() },
      { id:"tc2", type:"expense", date:"2026-07-02", amount:50, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    const transfers = L.DB.transactions.filter(t => t.type === "transfer");
    expect(transfers.length).toBe(1);
    expect(transfers[0].category).toBe("c3");
  });
});

/* ============================================================
   13. Delete transaction with various types
   ============================================================ */
describe("TX Types: Delete cleanup", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("deleting expense does not affect other transactions", () => {
    seedDB();
    L.DB.transactions = [
      { id:"del1", type:"expense", date:"2026-07-01", amount:100, desc:"", notes:"", account:"a1", category:"c1", subcategory:"", created:1 },
      { id:"del2", type:"income", date:"2026-07-02", amount:200, desc:"", notes:"", account:"a1", category:"c2", subcategory:"", created:2 },
    ];
    L.deleteTransaction("del1");
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].id).toBe("del2");
  });

  it("deleting a transfer does not affect other transfers", () => {
    seedDB();
    L.DB.transactions = [
      { id:"del3", type:"transfer", date:"2026-07-01", amount:100, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:1 },
      { id:"del4", type:"transfer", date:"2026-07-02", amount:200, desc:"", notes:"", fromType:"account", fromId:"a1", toType:"account", toId:"a2", category:"", subcategory:"", created:2 },
    ];
    L.deleteTransaction("del3");
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].id).toBe("del4");
  });
});

/* ============================================================
   14. Cross-currency with different conversion rates
   ============================================================ */
describe("TX Types: Cross-currency edge cases", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("very small conversion amount (e.g., 0.01)", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 100, 0.01, "Tiny", "", "account", "a1", "account", "a4", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-100);
    expect(L.accountBalance("a4")).toBe(0.01);
  });

  it("same amount (no effective conversion loss)", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 500, 500, "Equal", "", "account", "a1", "account", "a4", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-500);
    expect(L.accountBalance("a4")).toBe(500);
  });

  it("very large amount (1 million)", () => {
    seedDB();
    const linkId = L.uid();
    simLinkedTransfer(linkId, "2026-07-01", 1000000, 1350000, "Big", "", "account", "a1", "account", "a4", Date.now(), "", "");
    expect(L.accountBalance("a1")).toBe(-1000000);
    expect(L.accountBalance("a4")).toBe(1350000);
  });
});
