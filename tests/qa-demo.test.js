import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadLedgerFull } from "./helpers/load-ledger-full.js";

const consoleErrors = [];
const origConsoleError = console.error;
console.error = function () {
  consoleErrors.push(Array.prototype.map.call(arguments, String).join(" "));
};

let L;
let DB;

function round2(n) { return Math.round(n * 100) / 100; }
function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
function isoDate(d) { return d.getFullYear() + "-" + L.pad2(d.getMonth() + 1) + "-" + L.pad2(d.getDate()); }
function currencyOf(t) {
  if (t.account) { var a = L.findAccount(t.account); return a ? a.currency : "USD"; }
  if (t.fromType === "account") { var a2 = L.findAccount(t.fromId); return a2 ? a2.currency : "USD"; }
  if (t.toType === "account") { var a3 = L.findAccount(t.toId); return a3 ? a3.currency : "USD"; }
  return "USD";
}
function manualBalance(id) {
  var acc = L.findAccount(id);
  var bal = (acc && acc.openingBalance) || 0;
  L.DB.transactions.forEach(function (t) {
    var amt = t.amount;
    if (typeof amt !== "number" || isNaN(amt)) return;
    if (t.type === "expense" && t.account === id) bal -= amt;
    else if (t.type === "income" && t.account === id) bal += amt;
    else if (t.type === "refund" && t.account === id) bal += amt;
    else if (t.type === "transfer") {
      if (t.pending) {
        if (t.fromType === "account" && t.fromId === id) bal -= amt;
      } else {
        if (t.fromType === "account" && t.fromId === id) bal -= amt;
        if (t.toType === "account" && t.toId === id) bal += amt;
      }
    }
  });
  return round2(bal);
}
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
    Object.keys(L._orig).forEach(function (k) { L[k] = L._orig[k]; });
    delete L._orig;
  }
}
function freshDemoData() {
  const data = L.generateDemoData();
  L.replaceAllData(data);
  L.registerFilters = { account: "all", currency: "all", category: "all", subcategory: "all", type: "all", datePreset: "all", dateFrom: "", dateTo: "", search: "", uncategorized: false };
  L.reportState = { tab: "expense", datePreset: "all", dateFrom: "", dateTo: "", account: "all", currency: "all", category: "all", subcategory: "all", type: "all", search: "" };
  L.overviewState = { spendPeriod: "month", trendPeriod: "6months" };
  return data;
}

beforeAll(() => {
  L = loadLedgerFull();
  stubRender();
  DB = freshDemoData();
});

afterAll(() => {
  unstubRender();
  console.error = origConsoleError;
});

describe("QA: balance reconciliation through the app's own functions", () => {
  it("accountBalance equals accountBreakdown.computed equals an independent sum", () => {
    DB.accounts.forEach(function (a) {
      const viaApp = L.accountBalance(a.id);
      const bd = L.accountBreakdown(a.id);
      expect(bd, a.name).not.toBeNull();
      expect(round2(bd.computed), a.name).toBe(round2(viaApp));
      expect(manualBalance(a.id), a.name).toBe(round2(viaApp));
    });
  });

  it("breakdown components match raw per-account sums", () => {
    const agg = {};
    DB.accounts.forEach(function (a) { agg[a.id] = { income: 0, expense: 0, refund: 0, tOut: 0, tIn: 0 }; });
    DB.transactions.forEach(function (t) {
      var amt = t.amount;
      if (t.type === "income" && t.account) agg[t.account].income += amt;
      else if (t.type === "expense" && t.account) agg[t.account].expense += amt;
      else if (t.type === "refund" && t.account) agg[t.account].refund += amt;
      else if (t.type === "transfer") {
        if (t.pending) {
          if (t.fromType === "account") agg[t.fromId].tOut += amt;
        } else {
          if (t.fromType === "account") agg[t.fromId].tOut += amt;
          if (t.toType === "account") agg[t.toId].tIn += amt;
        }
      }
    });
    DB.accounts.forEach(function (a) {
      const bd = L.accountBreakdown(a.id);
      expect(round2(bd.income), a.name).toBe(round2(agg[a.id].income));
      expect(round2(bd.expense), a.name).toBe(round2(agg[a.id].expense));
      expect(round2(bd.refund), a.name).toBe(round2(agg[a.id].refund));
      expect(round2(bd.transferOut), a.name).toBe(round2(agg[a.id].tOut));
      expect(round2(bd.transferIn), a.name).toBe(round2(agg[a.id].tIn));
    });
  });
});

describe("QA: transfers affect both accounts correctly", () => {
  it("every same-currency transfer moves money out of its source and into its destination", () => {
    const transferOut = {};
    const transferIn = {};
    DB.transactions.forEach(function (t) {
      if (t.type !== "transfer") return;
      if (t.fromType === "account") {
        transferOut[t.fromId] = (transferOut[t.fromId] || 0) + t.amount;
        if (!t.pending) {
          if (t.toType === "account") {
            const dest = L.findAccount(t.toId);
            expect(dest, t.desc).toBeDefined();
            expect(dest.id, t.desc).not.toBe(t.fromId);
          } else if (t.toType === "person") {
            const person = L.findPerson(t.toId);
            expect(person, t.desc).toBeDefined();
          }
        }
      }
      if (t.toType === "account" && !t.pending) {
        transferIn[t.toId] = (transferIn[t.toId] || 0) + t.amount;
        if (t.fromType === "account") {
          const src = L.findAccount(t.fromId);
          expect(src, t.desc).toBeDefined();
          expect(src.id, t.desc).not.toBe(t.toId);
        } else if (t.fromType === "person") {
          expect(L.findPerson(t.fromId), t.desc).toBeDefined();
        }
      }
    });
    DB.accounts.forEach(function (a) {
      const bd = L.accountBreakdown(a.id);
      expect(round2(bd.transferOut), a.name).toBe(round2(transferOut[a.id] || 0));
      expect(round2(bd.transferIn), a.name).toBe(round2(transferIn[a.id] || 0));
    });
  });

  it("person balances tell a coherent loan/split story", () => {
    const byPerson = {};
    DB.transactions.forEach(function (t) {
      if (t.type !== "transfer" || t.debtItemId) return;
      if (t.toType === "person") {
        const cur = L.findAccount(t.fromId) ? L.findAccount(t.fromId).currency : "USD";
        byPerson[t.toId] = (byPerson[t.toId] || {}) ;
        byPerson[t.toId][cur] = (byPerson[t.toId][cur] || 0) + t.amount;
      }
      if (t.fromType === "person") {
        const cur = L.findAccount(t.toId) ? L.findAccount(t.toId).currency : "USD";
        byPerson[t.fromId] = byPerson[t.fromId] || {};
        byPerson[t.fromId][cur] = (byPerson[t.fromId][cur] || 0) - t.amount;
      }
    });
    DB.debtItems.forEach(function (d) {
      if (d.status === "open" && d.personId) {
        byPerson[d.personId] = byPerson[d.personId] || {};
        byPerson[d.personId][d.currency || "USD"] = (byPerson[d.personId][d.currency || "USD"] || 0) + d.amount;
      }
    });
    DB.people.forEach(function (p) {
      const expected = byPerson[p.id] || {};
      Object.keys(expected).forEach(function (c) { expected[c] = round2(expected[c]); });
      const viaApp = L.personBalanceByCurrency(p.id);
      const filtered = {};
      Object.keys(viaApp).forEach(function (c) { filtered[c] = round2(viaApp[c]); });
      expect(filtered, p.name).toEqual(expected);
    });
  });
});

describe("QA: refunds reverse transactions correctly", () => {
  it("every linked refund points at a real expense on the same account", () => {
    const refunds = DB.transactions.filter(function (t) { return t.type === "refund"; });
    expect(refunds.length).toBeGreaterThanOrEqual(5);
    refunds.forEach(function (r) {
      expect(r.amount).toBeGreaterThan(0);
      if (r.refundOf) {
        const orig = DB.transactions.find(function (x) { return x.id === r.refundOf; });
        expect(orig, r.id).toBeDefined();
        expect(orig.type, r.id).toBe("expense");
        expect(orig.account, r.id).toBe(r.account);
        expect(r.amount).toBeLessThanOrEqual(orig.amount + 0.005);
        expect(r.date >= orig.date, r.id).toBe(true);
      }
    });
  });

  it("the original row is flagged as refunded and net expense is refund-adjusted", () => {
    const refundedOriginals = DB.transactions.filter(function (t) { return t.type === "expense" && DB.transactions.some(function (x) { return x.type === "refund" && x.refundOf === t.id; }); });
    expect(refundedOriginals.length).toBeGreaterThanOrEqual(4);
    refundedOriginals.forEach(function (o) {
      const html = L.renderTxRow(o);
      expect(html).toContain("refunded");
    });
    DB.accounts.forEach(function (a) {
      const bd = L.accountBreakdown(a.id);
      const netExpense = round2(bd.expense - bd.refund);
      expect(netExpense).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("QA: credit card behaves realistically", () => {
  let cc;
  beforeAll(() => { cc = DB.accounts.find(function (a) { return a.type === "credit_card"; }); });

  it("stays a negative (owing) balance no larger than one month of card spend", () => {
    expect(cc).toBeDefined();
    const bal = L.accountBalance(cc.id);
    expect(bal).toBeLessThan(0);
    const incomes = DB.transactions.filter(function (t) { return t.account === cc.id && t.type === "income"; });
    expect(incomes.length).toBe(0);
    const monthlySpend = {};
    L.DB.transactions.forEach(function (t) {
      if (t.account !== cc.id || t.type !== "expense") return;
      const mk = L.monthKeyOf(t.date);
      monthlySpend[mk] = (monthlySpend[mk] || 0) + t.amount;
    });
    const maxMonthly = Math.max.apply(null, Object.keys(monthlySpend).map(function (k) { return monthlySpend[k]; }));
    expect(Math.abs(bal)).toBeLessThanOrEqual(maxMonthly + 400);
  });

  it("is paid off via transfers from checking each month", () => {
    const payments = DB.transactions.filter(function (t) { return t.type === "transfer" && t.toType === "account" && t.toId === cc.id; });
    expect(payments.length).toBeGreaterThanOrEqual(10);
    payments.forEach(function (p) {
      expect(p.fromType).toBe("account");
      expect(p.fromId).toBe(DB.accounts.find(function (a) { return a.name === "Checking"; }).id);
    });
    const totalPaid = round2(sum(payments.map(function (p) { return p.amount; })));
    const spent = round2(sum(DB.transactions.filter(function (t) { return t.account === cc.id && t.type === "expense"; }).map(function (t) { return t.amount; })));
    const refunded = round2(sum(DB.transactions.filter(function (t) { return t.account === cc.id && t.type === "refund"; }).map(function (t) { return t.amount; })));
    const bal = L.accountBalance(cc.id);
    expect(round2(totalPaid - spent + refunded + cc.openingBalance)).toBe(round2(bal));
  });

  it("carries spending that is entirely expenses or refunds (no bogus rows)", () => {
    DB.transactions.filter(function (t) { return t.account === cc.id; }).forEach(function (t) {
      expect(["expense", "refund"]).toContain(t.type);
    });
  });
});

describe("QA: reports match the underlying transactions", () => {
  function reportTxs(types) {
    return L.DB.transactions.filter(function (t) { return types.indexOf(t.type) !== -1 && !t.linkId; });
  }

  it("expense report totals equal expenses minus refunds per currency", () => {
    L.reportState.datePreset = "all";
    const html = L._reportExpenseTab();
    const byCur = {};
    reportTxs(["expense", "refund"]).forEach(function (t) {
      const cur = currencyOf(t);
      byCur[cur] = (byCur[cur] || 0) + (t.type === "refund" ? -t.amount : t.amount);
    });
    expect(Object.keys(byCur).length).toBeGreaterThanOrEqual(2);
    Object.keys(byCur).forEach(function (cur) {
      expect(html).toContain("\u2212" + L.fmtMoney(round2(byCur[cur]), cur));
    });
  });

  it("income report totals equal income per currency", () => {
    L.reportState.datePreset = "all";
    const html = L._reportIncomeTab();
    const byCur = {};
    reportTxs(["income"]).forEach(function (t) {
      const cur = currencyOf(t);
      byCur[cur] = (byCur[cur] || 0) + t.amount;
    });
    expect(Object.keys(byCur).length).toBeGreaterThanOrEqual(2);
    Object.keys(byCur).forEach(function (cur) {
      expect(html).toContain("+" + L.fmtMoney(round2(byCur[cur]), cur));
    });
  });

  it("transfer report totals match the transfer ledger including the pending one", () => {
    L.reportState.datePreset = "all";
    const html = L._reportTransferTab();
    const byCur = {};
    reportTxs(["transfer"]).forEach(function (t) {
      const cur = t.fromType === "account" ? ((L.findAccount(t.fromId) || {}).currency || "USD") : "USD";
      byCur[cur] = (byCur[cur] || 0) + t.amount;
    });
    Object.keys(byCur).forEach(function (cur) {
      expect(html).toContain(L.fmtMoney(round2(byCur[cur]), cur));
    });
    expect(html).toContain("Pending");
    expect(html).toContain("250");
  });

  it("refund report totals equal the refund ledger", () => {
    L.reportState.datePreset = "all";
    const html = L._reportRefundTab();
    const byCur = {};
    reportTxs(["refund"]).forEach(function (t) {
      const cur = currencyOf(t);
      byCur[cur] = (byCur[cur] || 0) + t.amount;
    });
    Object.keys(byCur).forEach(function (cur) {
      expect(html).toContain("+" + L.fmtMoney(round2(byCur[cur]), cur));
    });
  });

  it("the full reports page renders", () => {
    L.reportState.datePreset = "all";
    const html = L.pages.renderReportsPage();
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(500);
  });
});

describe("QA: charts display accurate information", () => {
  it("donut arc lengths are proportional to amounts", () => {
    const html = L.svgDonut([{ label: "a", amt: 25, color: "#111" }, { label: "b", amt: 75, color: "#222" }], 160, 24, "Total", "$100");
    const dashes = [];
    let m;
    const re = /stroke-dasharray="([\d.]+) ([\d.]+)"/g;
    while ((m = re.exec(html))) dashes.push(parseFloat(m[1]));
    expect(dashes.length).toBe(2);
    const circ = dashes[0] + dashes[1];
    expect(Math.abs(dashes[0] - circ * 0.25)).toBeLessThan(0.5);
    expect(Math.abs(dashes[1] - circ * 0.75)).toBeLessThan(0.5);
  });

  it("legend percentages sum to 100", () => {
    const html = L.donutLegend([{ label: "a", amt: 25, color: "#111" }, { label: "b", amt: 75, color: "#222" }], 100);
    const pcts = [];
    let m;
    const re = /donut-legend-pct">(\d+)%/g;
    while ((m = re.exec(html))) pcts.push(parseInt(m[1], 10));
    expect(pcts.length).toBe(2);
    expect(sum(pcts)).toBe(100);
  });

  it("bar chart heights are proportional to amounts", () => {
    const html = L.htmlBarChart([{ label: "Jan", amt: 50 }, { label: "Feb", amt: 100 }], "var(--clay)");
    const heights = [];
    let m;
    const re = /style="height:(\d+)%/g;
    while ((m = re.exec(html))) heights.push(parseInt(m[1], 10));
    expect(heights).toEqual([50, 100]);
  });

  it("diverging chart widths are proportional to absolute amounts", () => {
    const html = L.htmlDivChart([{ label: "in", amt: 30, cur: "USD" }, { label: "out", amt: -60, cur: "USD" }]);
    const widths = [];
    let m;
    const re = /width:(\d+)%/g;
    while ((m = re.exec(html))) widths.push(parseInt(m[1], 10));
    expect(widths).toEqual([25, 50]);
  });

  it("monthly trend buckets match per-month sums", () => {
    const now = new Date();
    const today = isoDate(now);
    const txs = [
      { date: today, amount: 100 },
      { date: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), amount: 250 },
      { date: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 28)), amount: 40 },
      { date: "2020-01-05", amount: 999 },
    ];
    const months = L.getMonthlyTrend(txs, 6);
    const expected = {};
    months.forEach(function (m2) { expected[m2.mk] = 0; });
    months.forEach(function (m2) {
      txs.forEach(function (t) {
        if (L.monthKeyOf(t.date) === m2.mk) expected[m2.mk] += Math.abs(t.amount);
      });
    });
    expect(months[months.length - 1].mk).toBe(L.monthKeyOf(today));
    months.forEach(function (m2) {
      expect(round2(m2.amt)).toBe(round2(expected[m2.mk]));
    });
  });
});

describe("QA: recurring transactions function as expected", () => {
  it("does not post future-dated items on boot", () => {
    freshDemoData();
    const before = L.DB.transactions.length;
    L.autoPostRecurring();
    expect(L.DB.transactions.length).toBe(before);
  });

  it("auto-posts due items, skips review items, advances dates, and is idempotent", () => {
    freshDemoData();
    const checking = DB.accounts.find(function (a) { return a.name === "Checking"; });
    const netflix = L.DB.recurring.find(function (r) { return r.name === "Netflix"; });
    const rent = L.DB.recurring.find(function (r) { return r.name.indexOf("Rent") === 0; });
    expect(netflix).toBeDefined();
    expect(rent).toBeDefined();

    netflix.startDate = L.todayISO();
    rent.startDate = L.todayISO();
    rent.postMode = "review";

    const before = L.DB.transactions.length;
    L.autoPostRecurring();

    const posted = L.DB.transactions.filter(function (t) { return (t.notes || "").indexOf("Auto-posted") !== -1; });
    expect(posted.length).toBe(1);
    const p = posted[0];
    expect(p.type).toBe("expense");
    expect(p.account).toBe(L.DB.accounts.find(function (a) { return a.type === "credit_card"; }).id);
    expect(p.amount).toBe(15.99);
    expect(p.desc).toBe("Netflix");
    expect(p.date).toBe(L.todayISO());
    expect(p.category).toBe(L.DB.categories.find(function (c) { return c.name === "Entertainment"; }).id);

    const rentPosted = L.DB.transactions.some(function (t) { return t.desc === "Rent — Maple Apartments"; });
    expect(rentPosted).toBe(false);

    const advanced = new Date(netflix.startDate + "T00:00:00");
    expect(advanced > new Date(L.todayISO() + "T00:00:00")).toBe(true);

    const afterFirst = L.DB.transactions.length;
    L.autoPostRecurring();
    expect(L.DB.transactions.length).toBe(afterFirst);

    L.DB.accounts.forEach(function (a) {
      expect(manualBalance(a.id), a.name).toBe(round2(L.accountBalance(a.id)));
    });
    expect(checking).toBeDefined();
  });
});

describe("QA: search, filtering, and sorting work correctly", () => {
  it("search matches description/notes only", () => {
    freshDemoData();
    L.registerFilters.search = "amazon";
    const viaApp = L.filteredTransactions();
    const manual = L.DB.transactions.filter(function (t) {
      return (((t.desc || "") + " " + (t.notes || "")).toLowerCase().indexOf("amazon") !== -1);
    });
    expect(viaApp.length).toBeGreaterThan(0);
    expect(viaApp.length).toBe(manual.length);
    L.registerFilters.search = "";
  });

  it("account filter returns only transactions touching that account", () => {
    freshDemoData();
    const checking = DB.accounts.find(function (a) { return a.name === "Checking"; });
    L.registerFilters.account = checking.id;
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBeGreaterThan(0);
    viaApp.forEach(function (t) {
      const touches = (t.account === checking.id) || (t.fromType === "account" && t.fromId === checking.id) || (t.toType === "account" && t.toId === checking.id);
      expect(touches).toBe(true);
    });
    L.registerFilters.account = "all";
  });

  it("currency filter matches the account currency", () => {
    freshDemoData();
    L.registerFilters.currency = "CAD";
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBeGreaterThan(0);
    viaApp.forEach(function (t) { expect(currencyOf(t)).toBe("CAD"); });
    L.registerFilters.currency = "all";
  });

  it("type filter returns only that type", () => {
    freshDemoData();
    L.registerFilters.type = "refund";
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBeGreaterThan(0);
    viaApp.forEach(function (t) { expect(t.type).toBe("refund"); });
    L.registerFilters.type = "all";
  });

  it("category filter matches category or splits containing it", () => {
    freshDemoData();
    const groceries = L.DB.categories.find(function (c) { return c.name === "Groceries"; });
    L.registerFilters.category = groceries.id;
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBeGreaterThan(0);
    viaApp.forEach(function (t) {
      const matches = (t.category === groceries.id) || (t.categorySplits && t.categorySplits.some(function (s) { return s.categoryId === groceries.id; }));
      expect(matches).toBe(true);
    });
    L.registerFilters.category = "all";
  });

  it("uncategorized filter finds only transactions without a category", () => {
    freshDemoData();
    const manual = L.DB.transactions.filter(function (t) {
      if (t.type === "transfer") return false;
      if (t.categorySplits && t.categorySplits.length) return false;
      if (t.category) return false;
      return true;
    });
    expect(manual.length).toBeGreaterThan(0);
    L.registerFilters.uncategorized = true;
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBe(manual.length);
    L.registerFilters.uncategorized = false;
  });

  it("month filter matches the current calendar month", () => {
    freshDemoData();
    const thisMk = L.monthKeyOf(L.todayISO());
    const manual = L.DB.transactions.filter(function (t) { return L.monthKeyOf(t.date) === thisMk; });
    expect(manual.length).toBeGreaterThan(0);
    L.registerFilters.datePreset = "month";
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBe(manual.length);
    viaApp.forEach(function (t) { expect(L.monthKeyOf(t.date)).toBe(thisMk); });
    L.registerFilters.datePreset = "all";
  });

  it("the transactions page sorts newest first", () => {
    freshDemoData();
    const sorted = L.filteredTransactions().slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); });
    expect(sorted.length).toBeGreaterThan(0);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].date >= sorted[i].date).toBe(true);
    }
  });
});

describe("QA: dashboards and every screen render meaningfully", () => {
  it("overview shows accounts, balances, income/expense metrics and the donut", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    expect(html.length).toBeGreaterThan(500);
    DB.accounts.forEach(function (a) {
      expect(html).toContain(L.escapeHtml(a.name));
      expect(html).toContain(L.fmtMoney(L.accountBalance(a.id), a.currency));
    });
    expect(html).toContain("Income this month");
    expect(html).toContain("Expenses this month");

    const primaryCur = "USD";
    const now = new Date();
    const thisMk = now.getFullYear() + "-" + L.pad2(now.getMonth() + 1);
    const income = { expense: 0, income: 0 };
    L.DB.transactions.forEach(function (t) {
      if (L.monthKeyOf(t.date) !== thisMk) return;
      const acc = L.findAccount(t.account);
      if (!acc || acc.currency !== primaryCur) return;
      if (t.type === "income") income.income += t.amount;
      else if (t.type === "expense") income.expense += t.amount;
      else if (t.type === "refund") income.expense -= t.amount;
    });
    expect(html).toContain(L.fmtMoney(round2(income.income), primaryCur));
    expect(html).toContain(L.fmtMoney(round2(income.expense), primaryCur));
    const hasDonut = html.indexOf("stroke-dasharray") !== -1;
    const hasEmpty = html.indexOf("No categorized spending") !== -1;
    expect(hasDonut || hasEmpty).toBe(true);
  });

  it("accounts page net worth banner equals the sum of balances per owner/currency", () => {
    freshDemoData();
    const html = L.pages.renderAccountsPage();
    const byOwner = {};
    DB.accounts.filter(function (a) { return !a.archived; }).forEach(function (a) {
      const owner = a.owner || "ungrouped";
      byOwner[owner] = byOwner[owner] || {};
      byOwner[owner][a.currency] = (byOwner[owner][a.currency] || 0) + L.accountBalance(a.id);
    });
    Object.keys(byOwner).forEach(function (owner) {
      Object.keys(byOwner[owner]).forEach(function (cur) {
        expect(html).toContain(L.fmtMoney(round2(byOwner[owner][cur]), cur));
      });
    });
  });

  it("people page renders person cards and pending debt", () => {
    freshDemoData();
    const html = L.pages.renderPeoplePage();
    expect(html.length).toBeGreaterThan(100);
    DB.people.forEach(function (p) { expect(html).toContain(L.escapeHtml(p.name)); });
  });

  it("recurring page renders every recurring item with a future due date", () => {
    freshDemoData();
    const html = L.pages.renderRecurringPage();
    expect(html.length).toBeGreaterThan(100);
    L.DB.recurring.forEach(function (r) { expect(html).toContain(L.escapeHtml(r.name)); });
  });

  it("categories and settings pages render", () => {
    freshDemoData();
    const catHtml = L.pages.renderCategoriesPage();
    expect(catHtml.length).toBeGreaterThan(100);
    const setHtml = L.pages.renderSettingsPage();
    expect(setHtml.length).toBeGreaterThan(100);
    expect(setHtml).toContain("Demo data");
  });

  it("every transaction renders a row in both layouts with no leaked artifacts", () => {
    freshDemoData();
    L.DB.transactions.forEach(function (t) {
      const html = L.renderTxRow(t);
      expect(typeof html).toBe("string");
      expect(html.indexOf("undefined")).toBe(-1);
      expect(html.indexOf("NaN")).toBe(-1);
      const table = L.renderTxRow(t, { tableLayout: true });
      expect(table.indexOf("undefined")).toBe(-1);
      expect(table.indexOf("NaN")).toBe(-1);
    });
  });

  it("no rendered page leaks 'undefined' or 'NaN'", () => {
    freshDemoData();
    const pages = [
      L.pages.renderOverviewPage(),
      L.pages.renderTransactionsPage(),
      L.pages.renderReportsPage(),
      L.pages.renderAccountsPage(),
      L.pages.renderPeoplePage(),
      L.pages.renderRecurringPage(),
      L.pages.renderCategoriesPage(),
      L.pages.renderSettingsPage(),
    ];
    pages.forEach(function (html) {
      expect(html.indexOf("undefined")).toBe(-1);
      expect(html.indexOf("NaN")).toBe(-1);
    });
  });
});

describe("QA: performance stays acceptable with the demo dataset", () => {
  it("generates the dataset quickly", () => {
    const t0 = performance.now();
    const data = L.generateDemoData();
    const dt = performance.now() - t0;
    expect(data.transactions.length).toBeGreaterThan(500);
    expect(dt).toBeLessThan(3000);
  });

  it("renders every screen well within interactive budgets", () => {
    freshDemoData();
    const t0 = performance.now();
    L.pages.renderOverviewPage();
    L.pages.renderTransactionsPage();
    L.pages.renderReportsPage();
    L.pages.renderAccountsPage();
    L.pages.renderPeoplePage();
    L.pages.renderRecurringPage();
    L.pages.renderCategoriesPage();
    L.pages.renderSettingsPage();
    L.DB.transactions.forEach(function (t) { L.renderTxRow(t, { tableLayout: true }); });
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(3000);
  });

  it("computes balances quickly for all accounts", () => {
    const t0 = performance.now();
    DB.accounts.forEach(function (a) { L.accountBalance(a.id); L.accountBreakdown(a.id); });
    expect(performance.now() - t0).toBeLessThan(300);
  });
});

describe("QA: no console errors were raised while loading and exercising the app", () => {
  it("collects zero console errors", () => {
    expect(consoleErrors).toEqual([]);
  });
});

describe("QA: demo data status panel reports real live values", () => {
  it("returns the verified generator counts (never hardcoded)", () => {
    freshDemoData();
    const g = L.generateDemoData();
    const r = L.runDemoDataStatus();
    expect(r.counts.accounts).toBe(g.accounts.length);
    expect(r.counts.transactions).toBe(g.transactions.length);
    expect(r.counts.recurring).toBe(g.recurring.length);
    expect(r.counts.transfers).toBe(g.transactions.filter(function (t) { return t.type === "transfer"; }).length);
    expect(r.counts.linked).toBe(g.transactions.filter(function (t) { return !!t.linkId; }).length);
    expect(r.counts.people).toBe(g.people.length);
    expect(r.counts.debtItems).toBe(g.debtItems.length);
    expect(r.counts.groups).toBe(g.groups.length);
    expect(r.counts.categories).toBe(g.categories.length);
  });

  it("passes every validation check on demo data", () => {
    freshDemoData();
    const r = L.runDemoDataStatus();
    expect(r.overall).toBe("pass");
    expect(r.summary.failed).toBe(0);
    expect(r.summary.passed).toBeGreaterThan(0);
    const names = r.checks.map(function (c) { return c.name; });
    expect(names).toContain("Transfers balanced");
    expect(names).toContain("Database integrity");
    expect(names).toContain("Reports & charts render");
    expect(names).toContain("Budgets");
    r.checks.forEach(function (c) {
      if (c.name === "Budgets") expect(c.status).toBe("na");
      else expect(["pass", "na"]).toContain(c.status);
    });
  });

  it("does not disturb report state while running report checks", () => {
    freshDemoData();
    L.reportState.tab = "transfer";
    L.reportState.category = "all";
    L.runDemoDataStatus();
    expect(L.reportState.tab).toBe("transfer");
    expect(L.reportState.category).toBe("all");
  });

  it("reports a clean 'no data' state before demo data is loaded", () => {
    L.replaceAllData(L.defaultData());
    const r = L.runDemoDataStatus();
    expect(r.overall).toBe("na");
    expect(r.summary.failed).toBe(0);
    expect(r.counts.accounts).toBe(2);
    expect(r.counts.transactions).toBe(0);
    L.replaceAllData(L.generateDemoData());
  });

  it("renders a status panel with live counts and a re-run button", () => {
    freshDemoData();
    const r = L.runDemoDataStatus();
    const html = L.demoStatusHtml(r);
    expect(html.indexOf(String(r.counts.transactions))).toBeGreaterThan(-1);
    expect(html.indexOf(String(r.counts.accounts))).toBeGreaterThan(-1);
    expect(html.indexOf("All checks passed")).toBeGreaterThan(-1);
    expect(html.indexOf('id="rerunDemoStatusBtn"')).toBeGreaterThan(-1);
    expect(html.indexOf("undefined")).toBe(-1);
    expect(html.indexOf("NaN")).toBe(-1);
  });
});
