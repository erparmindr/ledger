import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

function stubRender() {
  L._orig = {
    renderPage: L.renderPage, renderNav: L.renderNav, wirePageEvents: L.wirePageEvents,
    refreshIcons: L.refreshIcons, initCustomDropdowns: L.initCustomDropdowns,
    showToast: L.showToast, navigateTo: L.navigateTo,
  };
  L.renderPage = function () {};
  L.renderNav = function () {};
  L.wirePageEvents = function () {};
  L.refreshIcons = function () {};
  L.initCustomDropdowns = function () {};
  L.showToast = function () {};
  L.navigateTo = function () {};
}
function unstubRender() {
  if (L._orig) {
    Object.keys(L._orig).forEach(function (k) {
      L[k] = L._orig[k];
    });
    delete L._orig;
  }
}

function sum(arr) {
  return arr.reduce(function (a, b) { return a + b; }, 0);
}
function round2(n) { return Math.round(n * 100) / 100; }

describe("generateDemoData", () => {
  let data;
  beforeAll(() => {
    data = L.generateDemoData();
    L.DB = data;
  });

  it("produces the expected top-level collections", () => {
    expect(Array.isArray(data.accounts)).toBe(true);
    expect(Array.isArray(data.transactions)).toBe(true);
    expect(Array.isArray(data.categories)).toBe(true);
    expect(Array.isArray(data.people)).toBe(true);
    expect(Array.isArray(data.recurring)).toBe(true);
    expect(Array.isArray(data.debtItems)).toBe(true);
    expect(Array.isArray(data.groups)).toBe(true);
    expect(typeof data.categoryLearning).toBe("object");
    expect(typeof data.subcategoryLearning).toBe("object");
  });

  it("has a realistic volume of data", () => {
    expect(data.accounts.length).toBeGreaterThanOrEqual(4);
    expect(data.people.length).toBeGreaterThanOrEqual(3);
    expect(data.recurring.length).toBeGreaterThanOrEqual(8);
    expect(data.debtItems.length).toBeGreaterThanOrEqual(3);
    expect(data.transactions.length).toBeGreaterThanOrEqual(500);
  });

  it("is deterministic", () => {
    const a = JSON.stringify(data);
    const b = JSON.stringify(L.generateDemoData());
    expect(b).toBe(a);
  });

  it("has no duplicate ids across any collection", () => {
    const seen = {};
    const collections = ["accounts", "people", "categories", "transactions", "recurring", "debtItems", "groups"];
    collections.forEach(function (key) {
      data[key].forEach(function (rec) {
        expect(seen[rec.id]).toBeUndefined();
        seen[rec.id] = true;
      });
    });
    data.categories.forEach(function (c) {
      (c.subs || []).forEach(function (s) {
        expect(seen[s.id]).toBeUndefined();
        seen[s.id] = true;
      });
    });
  });

  it("uses only ISO dates within the demo window (past through today)", () => {
    const now = new Date();
    const today = now.getFullYear() + "-" + L.pad2(now.getMonth() + 1) + "-" + L.pad2(now.getDate());
    let startM = now.getMonth() + 1 - 12;
    let startY = now.getFullYear();
    if (startM <= 0) { startM += 12; startY--; }
    const start = startY + "-" + L.pad2(startM) + "-01";
    data.transactions.forEach(function (t) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(t.date)).toBe(true);
      expect(t.date >= start).toBe(true);
      expect(t.date <= today).toBe(true);
    });
  });

  it("has valid amounts on every transaction", () => {
    data.transactions.forEach(function (t) {
      expect(typeof t.amount).toBe("number");
      expect(isFinite(t.amount)).toBe(true);
      expect(t.amount).toBeGreaterThan(0);
      expect(Math.abs(round2(t.amount) - t.amount)).toBeLessThan(0.0001);
    });
  });

  it("has transactions in every month of the window", () => {
    const now = new Date();
    let m = now.getMonth() + 1 - 12;
    let y = now.getFullYear();
    if (m <= 0) { m += 12; y--; }
    for (let i = 0; i < 12; i++) {
      const mk = y + "-" + L.pad2(m);
      expect(data.transactions.some(function (t) { return L.monthKeyOf(t.date) === mk; })).toBe(true);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  });

  it("references only existing accounts and people", () => {
    const acctIds = {};
    data.accounts.forEach(function (a) { acctIds[a.id] = true; });
    const personIds = {};
    data.people.forEach(function (p) { personIds[p.id] = true; });
    const catIds = {};
    data.categories.forEach(function (c) { catIds[c.id] = true; });
    data.transactions.forEach(function (t) {
      if (t.account) expect(acctIds[t.account]).toBe(true);
      if (t.categorySplits && t.categorySplits.length) {
        t.categorySplits.forEach(function (s) { expect(catIds[s.categoryId]).toBe(true); });
      } else if (t.category) {
        expect(catIds[t.category]).toBe(true);
      }
      if (t.friendSplit && t.friendSplit.shares) {
        t.friendSplit.shares.forEach(function (s) {
          if (s.personId) expect(personIds[s.personId]).toBe(true);
        });
      }
      if (t.fromId) {
        if (t.fromType === "account") expect(acctIds[t.fromId]).toBe(true);
        if (t.fromType === "person") expect(personIds[t.fromId]).toBe(true);
      }
      if (t.toId) {
        if (t.toType === "account") expect(acctIds[t.toId]).toBe(true);
        if (t.toType === "person") expect(personIds[t.toId]).toBe(true);
      }
      if (t.refundOf) {
        const orig = data.transactions.find(function (x) { return x.id === t.refundOf; });
        expect(orig).toBeDefined();
        expect(orig.type).toBe("expense");
        expect(orig.account).toBe(t.account);
      }
    });
  });

  it("reconciles every account balance exactly (opening + flows = current)", () => {
    data.accounts.forEach(function (a) {
      let income = 0, expense = 0, refund = 0, out = 0, inFlow = 0;
      data.transactions.forEach(function (t) {
        const amt = t.amount;
        if (t.type === "income" && t.account === a.id) income += amt;
        else if (t.type === "expense" && t.account === a.id) expense += amt;
        else if (t.type === "refund" && t.account === a.id) refund += amt;
        else if (t.type === "transfer") {
          if (t.fromType === "account" && t.fromId === a.id) out += amt;
          if (t.toType === "account" && t.toId === a.id && !t.pending) inFlow += amt;
        }
      });
      const computed = round2((a.openingBalance || 0) + income - expense + refund - out + inFlow);
      const breakdown = L.accountBreakdown(a.id);
      expect(computed).toBe(breakdown.computed);
      expect(L.accountBalance(a.id)).toBe(breakdown.computed);
    });
  });

  it("keeps balances believable", () => {
    const bal = {};
    data.accounts.forEach(function (a) { bal[a.id] = L.accountBalance(a.id); });
    const checking = data.accounts.find(function (a) { return a.name === "Checking"; });
    const cc = data.accounts.find(function (a) { return a.type === "credit_card"; });
    const savings = data.accounts.find(function (a) { return a.name === "Savings"; });
    const cash = data.accounts.find(function (a) { return a.name === "Cash"; });
    expect(bal[checking.id]).toBeGreaterThan(0);
    expect(bal[cc.id]).toBeLessThan(0);
    expect(bal[savings.id]).toBeGreaterThan(0);
    expect(bal[cash.id]).toBeGreaterThanOrEqual(0);
  });

  it("keeps the credit card paid in full so it never runs up a huge balance", () => {
    const cc = data.accounts.find(function (a) { return a.type === "credit_card"; });
    const payments = data.transactions.filter(function (t) {
      return t.type === "transfer" && t.toType === "account" && t.toId === cc.id;
    });
    expect(payments.length).toBeGreaterThanOrEqual(10);
    payments.forEach(function (p) {
      expect(p.fromType).toBe("account");
      expect(p.fromId).not.toBe(cc.id);
    });
    const bal = L.accountBreakdown(cc.id);
    expect(bal.computed).toBeLessThan(0);
    expect(Math.abs(bal.computed)).toBeLessThan(6000);
  });

  it("has well-formed same-currency transfers", () => {
    data.transactions.filter(function (t) { return t.type === "transfer" && !t.linkId; }).forEach(function (t) {
      expect(t.fromType).toMatch(/account|person/);
      expect(t.toType).toMatch(/account|person/);
      expect(t.fromId).toBeTruthy();
      if (t.toId === "") {
        expect(t.pending).toBe(true);
      } else {
        expect(t.toId).toBeTruthy();
        expect(t.fromType + t.fromId).not.toBe(t.toType + t.toId);
      }
    });
  });

  it("has exactly one orphan transfer (the pending destination)", () => {
    const dangling = data.transactions.filter(function (t) { return t.type === "transfer" && !t.toId; });
    expect(dangling.length).toBe(1);
    expect(dangling[0].pending).toBe(true);

    let orphans = [];
    data.accounts.forEach(function (a) { orphans = orphans.concat(L.findOrphanTransfers(a.id)); });
    const unexplained = orphans.filter(function (o) {
      if (o.pending) return false;
      if (o.fromType === "person" && data.people.some(function (p) { return p.id === o.fromId; })) return false;
      if (o.toType === "person" && data.people.some(function (p) { return p.id === o.toId; })) return false;
      return true;
    });
    expect(unexplained.length).toBe(0);
  });

  it("links every cross-currency transfer as an out/in pair", () => {
    const linked = data.transactions.filter(function (t) { return t.linkId; });
    const byLink = {};
    linked.forEach(function (t) {
      if (!byLink[t.linkId]) byLink[t.linkId] = [];
      byLink[t.linkId].push(t);
    });
    const linkIds = Object.keys(byLink);
    expect(linkIds.length).toBeGreaterThan(0);
    linkIds.forEach(function (lid) {
      const pair = byLink[lid];
      expect(pair.length).toBe(2);
      const out = pair.find(function (t) { return t.linkRole === "out"; });
      const inR = pair.find(function (t) { return t.linkRole === "in"; });
      expect(out).toBeDefined();
      expect(inR).toBeDefined();
      expect(out.type).toBe("expense");
      expect(inR.type).toBe("income");
      expect(out.account).not.toBe(inR.account);
    });
  });

  it("category splits sum exactly to the transaction amount", () => {
    data.transactions.filter(function (t) { return t.categorySplits && t.categorySplits.length; }).forEach(function (t) {
      const s = round2(sum(t.categorySplits.map(function (x) { return x.amount; })));
      expect(Math.abs(s - t.amount)).toBeLessThan(0.005);
    });
  });

  it("friend splits have matching debt items", () => {
    const splits = data.transactions.filter(function (t) { return t.friendSplit && t.friendSplit.shares && t.friendSplit.shares.length; });
    expect(splits.length).toBeGreaterThanOrEqual(1);
    splits.forEach(function (t) {
      const items = data.debtItems.filter(function (d) { return d.sourceTransactionId === t.id; });
      expect(items.length).toBe(t.friendSplit.shares.length);
    });
  });

  it("a settled split share has a repayment transfer referencing the debt item", () => {
    const settled = data.debtItems.find(function (d) { return d.status === "settled"; });
    expect(settled).toBeDefined();
    const repayment = data.transactions.find(function (t) { return t.debtItemId === settled.id; });
    expect(repayment).toBeDefined();
    expect(repayment.type).toBe("transfer");
    expect(repayment.fromType).toBe("person");
    expect(repayment.toType).toBe("account");
  });

  it("has no duplicate transactions (by date/type/account/amount/description)", () => {
    const groups = L.findAllDuplicates();
    expect(groups.length).toBe(0);
  });

  it("populates most categories", () => {
    const used = {};
    data.transactions.forEach(function (t) {
      if (t.categorySplits && t.categorySplits.length) {
        t.categorySplits.forEach(function (s) { used[s.categoryId] = true; });
      } else if (t.category) {
        used[t.category] = true;
      }
    });
    expect(Object.keys(used).length).toBeGreaterThanOrEqual(16);
  });

  it("recurring items are valid and mix auto + review", () => {
    // nextDueDate lives in pages/overview.js (not loaded by the test helper); stub it with the app's real algorithm
    const origNextDueDate = L.nextDueDate;
    const origDaysInMonth = L.daysInMonth;
    L.daysInMonth = function (year, month) { return new Date(year, month + 1, 0).getDate(); };
    L.nextDueDate = function (r, fromDate) {
      fromDate = fromDate || L.todayISO();
      const start = new Date(r.startDate + "T00:00:00");
      const from = new Date(fromDate + "T00:00:00");
      if (r.frequency === "weekly" || r.frequency === "biweekly") {
        const stepDays = r.frequency === "weekly" ? 7 : 14;
        const diffDays = Math.round((from - start) / 86400000);
        if (diffDays < 0) return L.todayISOFromDate(start);
        const cyclesElapsed = Math.floor(diffDays / stepDays);
        const candidate = new Date(start);
        candidate.setDate(candidate.getDate() + cyclesElapsed * stepDays);
        if (candidate < from) candidate.setDate(candidate.getDate() + stepDays);
        return L.todayISOFromDate(candidate);
      }
      const day = start.getDate();
      let candidateMonth = new Date(from.getFullYear(), from.getMonth(), Math.min(day, L.daysInMonth(from.getFullYear(), from.getMonth())));
      if (candidateMonth < from) {
        let nm = from.getMonth() + 1, ny = from.getFullYear();
        if (nm > 11) { nm = 0; ny++; }
        candidateMonth = new Date(ny, nm, Math.min(day, L.daysInMonth(ny, nm)));
      }
      return L.todayISOFromDate(candidateMonth);
    };
    const modes = {};
    try {
      data.recurring.forEach(function (r) {
        expect(["weekly", "biweekly", "monthly"]).toContain(r.frequency);
        expect(["auto", "review"]).toContain(r.postMode);
        expect(L.findAccount(r.account)).toBeDefined();
        modes[r.postMode] = true;
        const due = L.nextDueDate(r, L.todayISO());
        expect(due >= L.todayISO()).toBe(true);
      });
    } finally {
      L.nextDueDate = origNextDueDate;
      L.daysInMonth = origDaysInMonth;
    }
    expect(modes.auto).toBe(true);
    expect(modes.review).toBe(true);
  });

  it("is a valid backup per the app's own validator", () => {
    const result = L.validateBackup(data);
    expect(result.valid).toBe(true);
  });
});

describe("loadDemoData", () => {
  beforeAll(() => { stubRender(); });

  it("installs the demo dataset through the canonical path", () => {
    const expected = L.generateDemoData();
    L.loadDemoData();
    expect(L.DB.transactions.length).toBe(expected.transactions.length);
    expect(L.DB.accounts.length).toBe(expected.accounts.length);
    expect(L.DB.people.length).toBe(expected.people.length);
    expect(L.DB.recurring.length).toBe(expected.recurring.length);
    expect(L.DB.debtItems.length).toBe(expected.debtItems.length);
    expect(L.DB.categories.length).toBe(expected.categories.length);
  });

  it("persists to storage", () => {
    const expectedCount = L.DB.transactions.length;
    const raw = L._localStorage.getItem(L.STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.transactions.length).toBe(expectedCount);
  });

  afterAll(() => unstubRender());
});
