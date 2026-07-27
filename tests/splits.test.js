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
      { id:"a2", name:"Savings", type:"savings", currency:"USD", owner:"", group:"default", archived:false, openingBalance:0, created:Date.now() },
    ],
    categories: [
      { id:"c1", name:"Food", type:"expense", subs:[{id:"s1",name:"Restaurants"},{id:"s2",name:"Groceries"}] },
      { id:"c2", name:"Transport", type:"expense", subs:[{id:"s3",name:"Gas"}] },
      { id:"c3", name:"Rent", type:"expense", subs:[] },
      { id:"c4", name:"Transfer", type:"transfer", subs:[] },
      { id:"c5", name:"Salary", type:"income", subs:[] },
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
   Category Split Tests
   ============================================================ */
describe("Split: Category splits", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("creates a category-split transaction", () => {
    seedDB();
    const tx = {
      id:"cs1", type:"expense", date:"2026-07-01", amount:100,
      desc:"Split purchase", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [
        { categoryId:"c1", amount:60 },
        { categoryId:"c2", amount:40 },
      ],
      created: Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].categorySplits.length).toBe(2);
    expect(L.DB.transactions[0].categorySplits[0].categoryId).toBe("c1");
    expect(L.DB.transactions[0].categorySplits[1].amount).toBe(40);
  });

  it("category split amounts sum to transaction total", () => {
    seedDB();
    const splits = [{ categoryId:"c1", amount:33.33 }, { categoryId:"c2", amount:33.33 }, { categoryId:"c3", amount:33.34 }];
    const tx = {
      id:"cs2", type:"expense", date:"2026-07-01", amount:100,
      desc:"3-way split", notes:"", account:"a1",
      category:"", subcategory:"", categorySplits: splits, created:Date.now()
    };
    const sum = tx.categorySplits.reduce((a, s) => a + s.amount, 0);
    expect(sum).toBe(100);
  });

  it("category split renders as 'split: ...' in category label", () => {
    seedDB();
    const tx = {
      id:"cs3", type:"expense", date:"2026-07-01", amount:100,
      desc:"Split", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:50 }, { categoryId:"c2", amount:50 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    const t = L.DB.transactions[0];
    const label = "split: " + t.categorySplits.map(s => L.categoryName(s.categoryId)).join(", ");
    expect(label).toBe("split: Food, Transport");
  });

  it("removing a split clears categorySplits", () => {
    seedDB();
    const tx = {
      id:"cs4", type:"expense", date:"2026-07-01", amount:100,
      desc:"Split to remove", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:100 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions[0].categorySplits.length).toBe(1);
    L.updateTransaction("cs4", { categorySplits: null, category: "c1", subcategory: "s1" });
    expect(L.DB.transactions[0].categorySplits).toBeNull();
    expect(L.DB.transactions[0].category).toBe("c1");
  });

  it("balance counts full amount for category-split expense", () => {
    seedDB();
    L.DB.transactions = [{
      id:"cs5", type:"expense", date:"2026-07-01", amount:200,
      desc:"Big split", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:120 }, { categoryId:"c2", amount:80 }],
      created: Date.now()
    }];
    expect(L.accountBalance("a1")).toBe(-200);
  });

  it("category split with 5 categories works correctly", () => {
    seedDB();
    const splits = [
      { categoryId:"c1", amount:20 },
      { categoryId:"c2", amount:20 },
      { categoryId:"c3", amount:20 },
      { categoryId:"c1", amount:20 },
      { categoryId:"c2", amount:20 },
    ];
    const tx = {
      id:"cs6", type:"expense", date:"2026-07-01", amount:100,
      desc:"5 splits", notes:"", account:"a1",
      category:"", subcategory:"", categorySplits: splits, created:Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions[0].categorySplits.length).toBe(5);
    const sum = L.DB.transactions[0].categorySplits.reduce((a, s) => a + s.amount, 0);
    expect(sum).toBe(100);
  });
});

/* ============================================================
   Friend Split Tests
   ============================================================ */
describe("Split: Friend splits", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("friend split creates expense + debt items", () => {
    seedDB();
    const yourShare = 30;
    const friendShares = [
      { personId:"p1", amount:25 },
      { personId:"p2", amount:25 },
    ];
    const tx = {
      id:"fs1", type:"expense", date:"2026-07-01", amount: yourShare,
      desc:"Dinner split", notes:"", account:"a1",
      category:"c1", subcategory:"s1",
      friendSplit: { yourShare, shares: friendShares },
      created: Date.now()
    };
    L.addTransaction(tx);
    friendShares.forEach(share => {
      L.DB.debtItems.push({
        id: L.uid(),
        sourceTransactionId: "fs1",
        personId: share.personId,
        description: "Dinner split",
        amount: share.amount,
        currency: "USD",
        status: "open",
        date: "2026-07-01",
        created: Date.now()
      });
    });
    expect(L.DB.transactions.length).toBe(1);
    expect(L.DB.transactions[0].amount).toBe(30);
    expect(L.DB.debtItems.length).toBe(2);
    expect(L.DB.debtItems[0].personId).toBe("p1");
    expect(L.DB.debtItems[0].amount).toBe(25);
    expect(L.DB.debtItems[0].sourceTransactionId).toBe("fs1");
  });

  it("friendSplit is persisted on transaction for re-editing", () => {
    seedDB();
    const tx = {
      id:"fs2", type:"expense", date:"2026-07-01", amount: 40,
      desc:"Persisted split", notes:"", account:"a1",
      category:"c1", subcategory:"s1",
      friendSplit: { yourShare: 20, shares: [{ personId:"p1", amount:20 }] },
      created: Date.now()
    };
    L.addTransaction(tx);
    const saved = L.DB.transactions.find(t => t.id === "fs2");
    expect(saved.friendSplit).toBeTruthy();
    expect(saved.friendSplit.yourShare).toBe(20);
    expect(saved.friendSplit.shares.length).toBe(1);
    expect(saved.friendSplit.shares[0].personId).toBe("p1");
  });

  it("friend split balance only counts your share", () => {
    seedDB();
    L.DB.transactions = [{
      id:"fs3", type:"expense", date:"2026-07-01", amount: 25,
      desc:"Your share", notes:"", account:"a1",
      category:"c1", subcategory:"",
      friendSplit: { yourShare: 25, shares: [{ personId:"p1", amount:75 }] },
      created: Date.now()
    }];
    expect(L.accountBalance("a1")).toBe(-25);
  });

  it("friend split debt items tracked per person", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d1", sourceTransactionId:"fs3", personId:"p1", description:"Dinner", amount:75, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
      { id:"d2", sourceTransactionId:"fs3", personId:"p2", description:"Dinner", amount:25, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
    ];
    const p1Debts = L.DB.debtItems.filter(d => d.personId === "p1" && d.status === "open");
    const p2Debts = L.DB.debtItems.filter(d => d.personId === "p2" && d.status === "open");
    expect(p1Debts.length).toBe(1);
    expect(p1Debts[0].amount).toBe(75);
    expect(p2Debts.length).toBe(1);
    expect(p2Debts[0].amount).toBe(25);
  });

  it("pending friend shares (no personId) have status 'pending'", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d3", sourceTransactionId:"fs4", personId:null, description:"Pending split", amount:50, currency:"USD", status:"pending", date:"2026-07-01", created:Date.now() },
    ];
    expect(L.DB.debtItems[0].status).toBe("pending");
    expect(L.DB.debtItems[0].personId).toBeNull();
  });
});

/* ============================================================
   Debt item lifecycle
   ============================================================ */
describe("Split: Debt item lifecycle", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("replaceDebtItemsForTransaction removes all debt for a transaction", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d10", sourceTransactionId:"tx99", personId:"p1", description:"A", amount:100, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
      { id:"d11", sourceTransactionId:"tx99", personId:"p2", description:"A", amount:50, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
      { id:"d12", sourceTransactionId:"tx98", personId:"p1", description:"B", amount:200, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
    ];
    L.replaceDebtItemsForTransaction("tx99", []);
    expect(L.DB.debtItems.length).toBe(1);
    expect(L.DB.debtItems[0].id).toBe("d12");
  });

  it("replaceDebtItemsForTransaction replaces with new items", () => {
    seedDB();
    L.DB.debtItems = [
      { id:"d20", sourceTransactionId:"tx88", personId:"p1", description:"Old", amount:100, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
    ];
    const newItems = [
      { id:"d21", sourceTransactionId:"tx88", personId:"p2", description:"New 1", amount:60, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
      { id:"d22", sourceTransactionId:"tx88", personId:null, description:"New 2", amount:40, currency:"USD", status:"pending", date:"2026-07-01", created:Date.now() },
    ];
    L.replaceDebtItemsForTransaction("tx88", newItems);
    expect(L.DB.debtItems.length).toBe(2);
    expect(L.DB.debtItems[0].personId).toBe("p2");
    expect(L.DB.debtItems[1].status).toBe("pending");
  });

  it("deleting a transaction cleans up orphaned debt items", () => {
    seedDB();
    L.DB.transactions = [
      { id:"tx-d1", type:"expense", date:"2026-07-01", amount:50, desc:"To delete", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    L.DB.debtItems = [
      { id:"d30", sourceTransactionId:"tx-d1", personId:"p1", description:"To delete", amount:50, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
      { id:"d31", sourceTransactionId:"tx-other", personId:"p2", description:"Keep", amount:100, currency:"USD", status:"open", date:"2026-07-01", created:Date.now() },
    ];
    L.deleteTransaction("tx-d1");
    expect(L.DB.transactions.length).toBe(0);
    expect(L.DB.debtItems.length).toBe(1);
    expect(L.DB.debtItems[0].id).toBe("d31");
  });

  it("deleting a transaction without debt items does not break", () => {
    seedDB();
    L.DB.transactions = [
      { id:"tx-d2", type:"expense", date:"2026-07-01", amount:10, desc:"No debt", notes:"", account:"a1", category:"c1", subcategory:"", created:Date.now() },
    ];
    L.DB.debtItems = [];
    L.deleteTransaction("tx-d2");
    expect(L.DB.transactions.length).toBe(0);
    expect(L.DB.debtItems.length).toBe(0);
  });
});

/* ============================================================
   Category split filtering in register
   ============================================================ */
describe("Split: Category split filtering", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("category split tx shows in filter if any split matches category", () => {
    seedDB();
    const tx = {
      id:"f1", type:"expense", date:"2026-07-01", amount:100,
      desc:"Multi-cat", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:50 }, { categoryId:"c2", amount:50 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    // Filter by c1 (Food) — should include
    const matchC1 = L.DB.transactions.filter(t =>
      t.category === "c1" || (t.categorySplits && t.categorySplits.some(s => s.categoryId === "c1"))
    );
    expect(matchC1.length).toBe(1);
    // Filter by c3 (Rent) — should NOT include
    const matchC3 = L.DB.transactions.filter(t =>
      t.category === "c3" || (t.categorySplits && t.categorySplits.some(s => s.categoryId === "c3"))
    );
    expect(matchC3.length).toBe(0);
  });

  it("category split tx excluded from uncategorized filter", () => {
    seedDB();
    const tx = {
      id:"f2", type:"expense", date:"2026-07-01", amount:100,
      desc:"Split", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:100 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    // Uncategorized filter: no category and no categorySplits
    const uncat = L.DB.transactions.filter(t =>
      !t.category && !(t.categorySplits && t.categorySplits.length)
    );
    expect(uncat.length).toBe(0);
  });
});

/* ============================================================
   Mutual exclusivity: category split vs friend split
   ============================================================ */
describe("Split: Mutual exclusivity", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("setting categorySplits clears friendSplit", () => {
    seedDB();
    const tx = {
      id:"mx1", type:"expense", date:"2026-07-01", amount:100,
      desc:"Switch", notes:"", account:"a1",
      category:"", subcategory:"",
      friendSplit: { yourShare: 50, shares: [{ personId:"p1", amount:50 }] },
      created: Date.now()
    };
    L.addTransaction(tx);
    L.updateTransaction("mx1", { friendSplit: null, categorySplits: [{ categoryId:"c1", amount:100 }] });
    expect(L.DB.transactions[0].friendSplit).toBeNull();
    expect(L.DB.transactions[0].categorySplits.length).toBe(1);
  });

  it("clearing categorySplits works correctly", () => {
    seedDB();
    const tx = {
      id:"mx2", type:"expense", date:"2026-07-01", amount:100,
      desc:"Clear", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:100 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    L.updateTransaction("mx2", { categorySplits: null, category: "c1", subcategory: "" });
    expect(L.DB.transactions[0].categorySplits).toBeNull();
    expect(L.DB.transactions[0].category).toBe("c1");
  });
});

/* ============================================================
   Edge cases: many splits, rounding, large amounts
   ============================================================ */
describe("Split: Edge cases", () => {
  beforeAll(() => stubRender());
  afterAll(() => unstubRender());

  it("category split with 10 categories", () => {
    seedDB();
    const splits = Array.from({ length: 10 }, (_, i) => ({ categoryId: i % 2 === 0 ? "c1" : "c2", amount: 10 }));
    const tx = {
      id:"ec1", type:"expense", date:"2026-07-01", amount:100,
      desc:"10 splits", notes:"", account:"a1",
      category:"", subcategory:"", categorySplits: splits, created:Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions[0].categorySplits.length).toBe(10);
    expect(L.DB.transactions[0].categorySplits.reduce((a, s) => a + s.amount, 0)).toBe(100);
  });

  it("friend split with 5 friends", () => {
    seedDB();
    const shares = Array.from({ length: 5 }, (_, i) => ({ personId: "p" + ((i % 2) + 1), amount: 16 }));
    const tx = {
      id:"ec2", type:"expense", date:"2026-07-01", amount:20,
      desc:"Big dinner", notes:"", account:"a1",
      category:"c1", subcategory:"",
      friendSplit: { yourShare: 20, shares },
      created: Date.now()
    };
    L.addTransaction(tx);
    L.DB.debtItems = shares.map((s, i) => ({
      id: "d" + i, sourceTransactionId: "ec2", personId: s.personId,
      description: "Big dinner", amount: s.amount, currency: "USD",
      status: "open", date: "2026-07-01", created: Date.now()
    }));
    expect(L.DB.debtItems.length).toBe(5);
    const totalDebt = L.DB.debtItems.reduce((a, d) => a + d.amount, 0);
    expect(totalDebt).toBe(80);
  });

  it("friend split with uneven amounts (cents)", () => {
    seedDB();
    const tx = {
      id:"ec3", type:"expense", date:"2026-07-01", amount:10,
      desc:"Small split", notes:"", account:"a1",
      category:"c1", subcategory:"",
      friendSplit: { yourShare: 3.34, shares: [{ personId:"p1", amount:3.33 }, { personId:"p2", amount:3.33 }] },
      created: Date.now()
    };
    L.addTransaction(tx);
    const total = tx.friendSplit.yourShare + tx.friendSplit.shares.reduce((a, s) => a + s.amount, 0);
    expect(Math.round(total * 100) / 100).toBe(10);
  });

  it("category split with very large amount ($10,000)", () => {
    seedDB();
    const tx = {
      id:"ec4", type:"expense", date:"2026-07-01", amount:10000,
      desc:"Big split", notes:"", account:"a1",
      category:"", subcategory:"",
      categorySplits: [{ categoryId:"c1", amount:5000 }, { categoryId:"c2", amount:3000 }, { categoryId:"c3", amount:2000 }],
      created: Date.now()
    };
    L.addTransaction(tx);
    expect(L.DB.transactions[0].amount).toBe(10000);
    expect(L.accountBalance("a1")).toBe(-10000);
  });

  it("6-way split → edit to 2-way: full math trace", () => {
    seedDB();
    // 5 friends
    ["p1","p2","p3","p4","p5"].forEach(pid => {
      L.DB.people.push({ id: pid, name: "Friend " + pid.slice(1), created: Date.now() });
    });

    // ---- STEP 1: Post a $120 bill split 6 ways (you + 5 friends) ----
    // $120 / 6 = $20 each
    const totalBill = 120;
    const shares6 = [
      { personId: "p1", amount: 20 },
      { personId: "p2", amount: 20 },
      { personId: "p3", amount: 20 },
      { personId: "p4", amount: 20 },
      { personId: "p5", amount: 20 },
    ];
    const yourShare6 = 20; // 120 - 100 = 20

    const tx = {
      id: "tx1", type: "expense", date: "2026-07-15", amount: yourShare6,
      desc: "Group dinner", notes: "", account: "a1",
      category: "c1", subcategory: "",
      friendSplit: { yourShare: yourShare6, shares: shares6 },
      created: Date.now()
    };
    L.addTransaction(tx);

    // Simulate what commitTransaction does: create debt items
    shares6.forEach(share => {
      L.DB.debtItems.push({
        id: L.uid(), sourceTransactionId: "tx1",
        personId: share.personId, description: "Group dinner",
        amount: share.amount, currency: "USD",
        status: "open", date: "2026-07-15", created: Date.now()
      });
    });

    // ---- CHECKS AFTER 6-WAY POST ----
    console.log("\n===== STEP 1: After 6-way split ($120 / 6 = $20 each) =====");
    console.log("Transaction amount (your expense):", L.DB.transactions[0].amount);
    console.log("Total expense from breakdown:", L.accountBreakdown("a1").expense);
    console.log("Account balance:", L.accountBalance("a1"));
    console.log("Debt items:", L.DB.debtItems.length);
    L.DB.debtItems.forEach(d => {
      const p = L.DB.people.find(x => x.id === d.personId);
      console.log("  -", p.name, "owes you", d.amount, "status:", d.status);
    });
    console.log("Person balances:");
    ["p1","p2","p3","p4","p5"].forEach(pid => {
      const bal = L.personBalanceByCurrency(pid);
      console.log("  -", pid, "balance:", bal);
    });

    expect(L.DB.transactions[0].amount).toBe(20);
    expect(L.accountBreakdown("a1").expense).toBe(20);
    expect(L.accountBalance("a1")).toBe(-20);
    expect(L.DB.debtItems.length).toBe(5);
    expect(L.DB.debtItems.filter(d => d.status === "open").length).toBe(5);
    const totalDebt6 = L.DB.debtItems.reduce((a, d) => a + d.amount, 0);
    expect(totalDebt6).toBe(100);
    // Your expense + friends' debt = total bill
    expect(L.DB.transactions[0].amount + totalDebt6).toBe(120);

    // ---- STEP 2: Edit to 2-way split (you + 1 friend) ----
    // Simulate what commitTransaction does on edit:
    //   1. upsertTransaction (update tx amount to new yourShare)
    //   2. replaceDebtItemsForTransaction("tx1", [], true) → clears ALL old debt items
    //   3. Push new debt items for new shares

    const newYourShare = 60; // $120 / 2 = $60
    const newShares = [
      { personId: "p1", amount: 60 },
    ];

    // 2a. Update the transaction (like upsertTransaction does)
    const existingTx = L.DB.transactions.find(t => t.id === "tx1");
    existingTx.amount = newYourShare;
    existingTx.friendSplit = { yourShare: newYourShare, shares: newShares };

    // 2b. Clear old debt items (like replaceDebtItemsForTransaction does)
    L.DB.debtItems = L.DB.debtItems.filter(d => d.sourceTransactionId !== "tx1");

    // 2c. Push new debt items
    newShares.forEach(share => {
      L.DB.debtItems.push({
        id: L.uid(), sourceTransactionId: "tx1",
        personId: share.personId, description: "Group dinner",
        amount: share.amount, currency: "USD",
        status: "open", date: "2026-07-15", created: Date.now()
      });
    });

    // ---- CHECKS AFTER EDIT TO 2-WAY ----
    console.log("\n===== STEP 2: After edit to 2-way split ($120 / 2 = $60 each) =====");
    console.log("Transaction amount (your expense):", L.DB.transactions[0].amount);
    console.log("Total expense from breakdown:", L.accountBreakdown("a1").expense);
    console.log("Account balance:", L.accountBalance("a1"));
    console.log("Debt items:", L.DB.debtItems.length);
    L.DB.debtItems.forEach(d => {
      const p = L.DB.people.find(x => x.id === d.personId);
      console.log("  -", p.name, "owes you", d.amount, "status:", d.status);
    });
    console.log("Person balances:");
    ["p1","p2","p3","p4","p5"].forEach(pid => {
      const bal = L.personBalanceByCurrency(pid);
      console.log("  -", pid, "balance:", bal);
    });

    expect(L.DB.transactions[0].amount).toBe(60);
    expect(L.accountBreakdown("a1").expense).toBe(60);
    expect(L.accountBalance("a1")).toBe(-60);
    expect(L.DB.debtItems.length).toBe(1);
    expect(L.DB.debtItems[0].personId).toBe("p1");
    expect(L.DB.debtItems[0].amount).toBe(60);
    expect(L.DB.debtItems[0].status).toBe("open");
    // Your expense + friends' debt = total bill (still 120)
    const totalDebt2 = L.DB.debtItems.reduce((a, d) => a + d.amount, 0);
    expect(L.DB.transactions[0].amount + totalDebt2).toBe(120);
    // p2-p5 have no debt items left → balance is 0
    expect(L.personBalanceByCurrency("p2")).toEqual({});
    expect(L.personBalanceByCurrency("p3")).toEqual({});
    expect(L.personBalanceByCurrency("p4")).toEqual({});
    expect(L.personBalanceByCurrency("p5")).toEqual({});
    // p1 still owes $60
    expect(L.personBalanceByCurrency("p1")).toEqual({ USD: 60 });
  });

  it("6-way split → edit to 2-way: category split excluded from expense math", () => {
    seedDB();
    // Same scenario but verify category split is unaffected
    const tx = {
      id: "tx2", type: "expense", date: "2026-07-15", amount: 20,
      desc: "Group dinner", notes: "", account: "a1",
      category: "c1", subcategory: "",
      friendSplit: { yourShare: 20, shares: [
        { personId: "p1", amount: 20 },
        { personId: "p2", amount: 20 },
        { personId: "p3", amount: 20 },
        { personId: "p4", amount: 20 },
        { personId: "p5", amount: 20 },
      ]},
      created: Date.now()
    };
    L.addTransaction(tx);
    ["p1","p2","p3","p4","p5"].forEach((pid, i) => {
      L.DB.debtItems.push({
        id: "d" + i, sourceTransactionId: "tx2",
        personId: pid, description: "Group dinner",
        amount: 20, currency: "USD",
        status: "open", date: "2026-07-15", created: Date.now()
      });
    });
    // Total of your share + all debt = 20 + 100 = 120
    expect(L.DB.transactions[0].amount + L.DB.debtItems.reduce((a,d) => a+d.amount, 0)).toBe(120);

    // Edit: change to yourShare=60, 1 friend
    L.DB.transactions[0].amount = 60;
    L.DB.transactions[0].friendSplit = { yourShare: 60, shares: [{ personId:"p1", amount:60 }] };
    L.DB.debtItems = L.DB.debtItems.filter(d => d.sourceTransactionId !== "tx2");
    L.DB.debtItems.push({
      id: "dnew", sourceTransactionId: "tx2",
      personId: "p1", description: "Group dinner",
      amount: 60, currency: "USD",
      status: "open", date: "2026-07-15", created: Date.now()
    });

    // Verify math still holds
    expect(L.DB.transactions[0].amount + L.DB.debtItems.reduce((a,d) => a+d.amount, 0)).toBe(120);
    expect(L.accountBalance("a1")).toBe(-60);
    expect(L.personBalanceByCurrency("p1")).toEqual({ USD: 60 });
    expect(L.personBalanceByCurrency("p2")).toEqual({});
  });

  it("category split sum always equals original bill after edit", () => {
    seedDB();
    // Simulates the real app pattern: last share = total - sum_of_others
    const scenarios = [
      { total: 60,  shares6: 5, yourShare6: 10,  shares2: 1, yourShare2: 30 },
      { total: 100, shares6: 5, yourShare6: 20,  shares2: 1, yourShare2: 50 },
      { total: 77,  shares6: 5, yourShare6: 13,  shares2: 1, yourShare2: 39 },
    ];

    scenarios.forEach(s => {
      seedDB();
      // Post 6-way: yourShare + 5 friends, last friend gets remainder
      const even6 = Math.round(((s.total - s.yourShare6) / s.shares6) * 100) / 100;
      const shares6 = Array.from({length: s.shares6}, (_, i) => ({
        personId: "p" + (i+1),
        amount: i < s.shares6 - 1 ? even6 : Math.round((s.total - s.yourShare6 - even6 * (s.shares6 - 1)) * 100) / 100
      }));
      L.DB.transactions.push({
        id:"sc1", type:"expense", date:"2026-07-15", amount: s.yourShare6,
        desc:"Test", notes:"", account:"a1", category:"c1", subcategory:"",
        friendSplit: { yourShare: s.yourShare6, shares: shares6 }, created: Date.now()
      });
      shares6.forEach(sh => {
        L.DB.debtItems.push({ id:L.uid(), sourceTransactionId:"sc1", personId:sh.personId,
          description:"Test", amount:sh.amount, currency:"USD", status:"open",
          date:"2026-07-15", created:Date.now() });
      });
      const debt6 = L.DB.debtItems.reduce((a,d) => a+d.amount, 0);
      expect(Math.round((s.yourShare6 + debt6)*100)/100).toBe(s.total);

      // Edit to 2-way: yourShare + 1 friend gets remainder
      L.DB.transactions[0].amount = s.yourShare2;
      L.DB.debtItems = [];
      L.DB.debtItems.push({ id:"dnew", sourceTransactionId:"sc1", personId:"p1",
        description:"Test", amount: Math.round((s.total - s.yourShare2)*100)/100,
        currency:"USD", status:"open", date:"2026-07-15", created:Date.now() });
      const debt2 = L.DB.debtItems.reduce((a,d) => a+d.amount, 0);
      expect(Math.round((s.yourShare2 + debt2)*100)/100).toBe(s.total);
    });
  });
});
