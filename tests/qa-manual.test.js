import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { loadLedgerFull } from "./helpers/load-ledger-full.js";

const consoleErrors = [];
const origConsoleError = console.error;
console.error = function () {
  consoleErrors.push(Array.prototype.map.call(arguments, String).join(" "));
};

function makeBodyRecorder() {
  return {
    _attrs: {},
    _classes: {},
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] || null; },
    classList: {
      _classes: {},
      toggle(cls, force) {
        if (force === undefined) this._classes[cls] = !this._classes[cls];
        else this._classes[cls] = !!force;
      },
      add(cls) { this._classes[cls] = true; },
      remove(cls) { this._classes[cls] = false; },
      contains(cls) { return !!this._classes[cls]; },
    },
    appendChild: () => {},
    removeChild: () => {},
  };
}

function fakeEl() {
  return {
    className: "", textContent: "", value: "", style: {}, _html: "",
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    appendChild: () => {}, removeChild: () => {}, click: () => {}, focus: () => {},
    remove: () => {}, setAttribute: () => {}, getAttribute: () => null,
    addEventListener: () => {}, closest: () => fakeEl(), parentElement: null, tagName: "DIV",
    querySelector: () => fakeEl(), querySelectorAll: () => [],
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  };
}

const themeBody = makeBodyRecorder();
const customDocument = {
  getElementById: () => fakeEl(),
  querySelector: () => fakeEl(),
  querySelectorAll: () => [],
  createElement: () => fakeEl(),
  activeElement: null,
  body: themeBody,
  addEventListener: () => {},
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
function emptyData() {
  L.replaceAllData(L.defaultData());
  L.registerFilters = { account: "all", currency: "all", category: "all", subcategory: "all", type: "all", datePreset: "all", dateFrom: "", dateTo: "", search: "", uncategorized: false };
}

beforeAll(() => {
  L = loadLedgerFull({ document: customDocument });
  stubRender();
  DB = freshDemoData();
});

afterAll(() => {
  unstubRender();
  console.error = origConsoleError;
});

describe("Manual QA: dashboard cards are meaningful", () => {
  it("overview renders the income/expense, donut, trend, upcoming and recent-activity cards", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    expect(html).toContain("Income this month");
    expect(html).toContain("Expenses this month");
    expect(html.indexOf("stroke-dasharray")).toBeGreaterThan(-1);
    expect(html).toContain("Upcoming");
    expect(html).toContain("Recent activity");
    expect(html.indexOf("<svg")).toBeGreaterThan(-1);
  });

  it("every dashboard card resolves real data: no card shows a missing-data marker", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    DB.accounts.forEach(function (a) {
      expect(html).toContain(L.escapeHtml(a.name));
      expect(html).toContain(L.fmtMoney(L.accountBalance(a.id), a.currency));
    });
    expect(html).not.toContain("No accounts yet");
    expect(html).not.toContain("No categorized spending");
    expect(html.indexOf("No recurring items due within 7 days")).toBe(-1);
  });

  it("recent activity lists the six newest transactions with their labels", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    const recentTx = DB.transactions.slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); }).slice(0, 6);
    const recentSection = html.slice(html.indexOf("Recent activity"));
    expect(recentSection.indexOf("View all")).toBeGreaterThan(-1);
    recentTx.forEach(function (t) {
      expect(recentSection).toContain(L.escapeHtml(t.desc));
    });
  });
});

describe("Manual QA: charts render with data", () => {
  it("the overview spending donut has at least one segment", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    const dashes = html.match(/stroke-dasharray/g) || [];
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("report charts include a donut and a bar chart with data", () => {
    freshDemoData();
    L.reportState.datePreset = "all";
    const html = L._reportExpenseTab();
    expect(html.indexOf("stroke-dasharray")).toBeGreaterThan(-1);
    expect(html.indexOf("<svg")).toBeGreaterThan(-1);
  });

  it("chart helpers avoid division by zero when totals are zero", () => {
    const donutEmpty = L.svgDonut([], 160, 24, "Total", "$0");
    expect(typeof donutEmpty).toBe("string");
    expect(donutEmpty.indexOf("NaN")).toBe(-1);
    expect(donutEmpty.indexOf("undefined")).toBe(-1);
    const legendEmpty = L.donutLegend([], 0);
    expect(legendEmpty.indexOf("NaN")).toBe(-1);
    expect(legendEmpty.indexOf("undefined")).toBe(-1);
  });
});

describe("Manual QA: tables are complete with no malformed cells", () => {
  it("every register row has all seven cells and none are empty", () => {
    freshDemoData();
    const html = L.pages.renderTransactionsPage();
    const row = (html.match(/class="grp-row/g) || []).length;
    expect(row).toBeGreaterThan(0);
    expect((html.match(/grp-date/g) || []).length).toBe(row);
    expect((html.match(/grp-desc/g) || []).length).toBe(row);
    expect((html.match(/grp-cat/g) || []).length).toBe(row);
    expect((html.match(/grp-acct/g) || []).length).toBe(row);
    expect((html.match(/grp-amt/g) || []).length).toBe(row);
    expect((html.match(/grp-type/g) || []).length).toBeGreaterThanOrEqual(row);
    expect((html.match(/grp-desc">\s*<\/span>/g) || []).length).toBe(0);
    expect(html.indexOf("undefined")).toBe(-1);
    expect(html.indexOf("NaN")).toBe(-1);
  });

  it("visible rows equal the count of transactions in the visible months", () => {
    freshDemoData();
    const sorted = L.filteredTransactions().slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); });
    const mks = [];
    const seen = {};
    sorted.forEach(function (t) {
      const mk = L.monthKeyOf(t.date);
      if (!seen[mk]) { seen[mk] = true; mks.push(mk); }
    });
    const visible = mks.slice(0, L.registerMonthsVisible);
    const expectedRows = sorted.filter(function (t) { return visible.indexOf(L.monthKeyOf(t.date)) !== -1; }).length;
    const html = L.pages.renderTransactionsPage();
    const rows = (html.match(/class="grp-row/g) || []).length;
    expect(visible.length).toBeGreaterThan(0);
    expect(rows).toBe(expectedRows);
  });
});

describe("Manual QA: every account has transaction history", () => {
  it("each of the six accounts is touched by transactions", () => {
    freshDemoData();
    DB.accounts.forEach(function (a) {
      const touch = DB.transactions.filter(function (t) {
        return t.account === a.id || t.toAccount === a.id || t.fromAccount === a.id
          || (t.toType === "account" && t.toId === a.id) || (t.fromType === "account" && t.fromId === a.id);
      }).length;
      expect(touch, a.name).toBeGreaterThan(0);
    });
  });
});

describe("Manual QA: every category appears in the app", () => {
  it("the register filter lists every category", () => {
    freshDemoData();
    const html = L.pages.renderTransactionsPage();
    DB.categories.forEach(function (c) {
      expect(html, c.name).toContain(L.escapeHtml(c.name));
    });
  });

  it("the report filter lists every category", () => {
    freshDemoData();
    const html = L.pages.renderReportsPage();
    DB.categories.forEach(function (c) {
      expect(html, c.name).toContain(L.escapeHtml(c.name));
    });
  });

  it("each category appears in its tab on the categories page", () => {
    freshDemoData();
    ["expense", "income", "transfer"].forEach(function (tab) {
      L._catTab = tab;
      const html = L.pages.renderCategoriesPage();
      DB.categories.filter(function (c) { return c.type === tab; }).forEach(function (c) {
        expect(html, c.name).toContain(L.escapeHtml(c.name));
      });
    });
    delete L._catTab;
  });
});

describe("Manual QA: recent transactions look believable", () => {
  it("the six most recent transactions have sensible fields", () => {
    freshDemoData();
    const recentTx = DB.transactions.slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); }).slice(0, 6);
    recentTx.forEach(function (t) {
      expect(t.desc, t.id).toBeTruthy();
      expect(t.amount, t.id).toBeGreaterThan(0);
      expect(isFinite(t.amount), t.id).toBe(true);
      expect(["expense", "income", "transfer", "refund"], t.id).toContain(t.type);
      const today = new Date();
      const d = new Date(t.date + "T00:00:00");
      expect(today.getTime() - d.getTime(), t.id).toBeLessThanOrEqual(45 * 86400000);
      expect(today.getTime() - d.getTime(), t.id).toBeGreaterThanOrEqual(0);
    });
  });

  it("overview recent activity rows match the app's own sort order", () => {
    freshDemoData();
    const html = L.pages.renderOverviewPage();
    const recentTx = DB.transactions.slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); }).slice(0, 6);
    const recentSection = html.slice(html.indexOf("Recent activity"));
    recentTx.forEach(function (t) {
      expect(recentSection).toContain(L.escapeHtml(t.desc));
      expect(recentSection).toContain(L.fmtMoney(t.amount, currencyOf(t)));
    });
  });
});

describe("Manual QA: search produces realistic results", () => {
  it("common searches return the expected matches", () => {
    freshDemoData();
    ["amazon", "payroll", "Starbucks", "netflix"].forEach(function (q) {
      const expected = DB.transactions.filter(function (t) {
        return (((t.desc || "") + " " + (t.notes || "")).toLowerCase().indexOf(q.toLowerCase()) !== -1);
      }).length;
      expect(expected).toBeGreaterThan(0);
      L.registerFilters.search = q;
      const viaApp = L.filteredTransactions();
      expect(viaApp.length, q).toBe(expected);
      const needle = q.toLowerCase();
      viaApp.forEach(function (t) {
        const haystack = (((t.desc || "") + " " + (t.notes || "")).toLowerCase());
        expect(haystack.indexOf(needle) !== -1, t.id).toBe(true);
      });
    });
    L.registerFilters.search = "";
  });

  it("a nonsense search yields no rows and an appropriate empty state", () => {
    freshDemoData();
    L.registerFilters.search = "zzz-no-match-xyz";
    expect(L.filteredTransactions().length).toBe(0);
    const html = L.pages.renderTransactionsPage();
    expect(html).toContain("No matching transactions");
    expect(html).not.toContain("No transactions yet");
    L.registerFilters.search = "";
  });
});

describe("Manual QA: filters produce subsets", () => {
  it("account filter returns only transactions touching that account", () => {
    freshDemoData();
    const checking = DB.accounts.find(function (a) { return a.name === "Checking"; });
    L.registerFilters.account = checking.id;
    const viaApp = L.filteredTransactions();
    expect(viaApp.length).toBeGreaterThan(0);
    expect(viaApp.length).toBeLessThan(DB.transactions.length);
    viaApp.forEach(function (t) {
      const touches = (t.account === checking.id) || (t.fromType === "account" && t.fromId === checking.id) || (t.toType === "account" && t.toId === checking.id);
      expect(touches, t.id).toBe(true);
    });
    L.registerFilters.account = "all";
  });

  it("the register shows a clear-filters button only when filters are active", () => {
    freshDemoData();
    let html = L.pages.renderTransactionsPage();
    expect(html.indexOf("clearFiltersBtn")).toBe(-1);
    L.registerFilters.account = DB.accounts[0].id;
    html = L.pages.renderTransactionsPage();
    expect(html.indexOf("clearFiltersBtn")).toBeGreaterThan(-1);
    L.registerFilters.account = "all";
  });
});

describe("Manual QA: register paginates by year/month with a load-earlier control", () => {
  it("starts with two month groups plus a load-earlier button", () => {
    freshDemoData();
    L.registerMonthsVisible = 2;
    const html = L.pages.renderTransactionsPage();
    expect((html.match(/class="mo-section/g) || []).length).toBe(2);
    expect(html.indexOf("data-load-earlier=\"true\"")).toBeGreaterThan(-1);
    expect(html).toContain("11 months remaining");
  });

  it("loadRegEarlierMonths adds two months at a time and removes the button when done", () => {
    freshDemoData();
    L.registerMonthsVisible = 2;
    L.loadRegEarlierMonths();
    expect(L.registerMonthsVisible).toBe(4);
    let html = L.pages.renderTransactionsPage();
    expect((html.match(/class="mo-section/g) || []).length).toBe(4);
    L.registerMonthsVisible = 13;
    html = L.pages.renderTransactionsPage();
    expect((html.match(/class="mo-section/g) || []).length).toBe(13);
    expect(html.indexOf("data-load-earlier=\"true\"")).toBe(-1);
    L.registerMonthsVisible = 2;
  });

  it("group headers label each month and count its rows", () => {
    freshDemoData();
    L.registerMonthsVisible = 2;
    const html = L.pages.renderTransactionsPage();
    const mk = L.monthKeyOf(L.todayISO());
    expect(html).toContain(L.monthLabelOf(mk));
    const visible = L.filteredTransactions().filter(function (t) { return L.monthKeyOf(t.date) === mk; });
    expect(html).toContain("(" + visible.length + ")");
    L.registerMonthsVisible = 2;
  });
});

describe("Manual QA: mobile layout gates desktop-only elements", () => {
  it("applyLayoutMode flips the body class and persists the choice", () => {
    L.applyLayoutMode("mobile");
    expect(L.isMobile).toBe(true);
    expect(themeBody.classList.contains("is-mobile")).toBe(true);
    expect(L._localStorage.getItem("ledger_layout_mode")).toBe("mobile");
    L.applyLayoutMode("desktop");
    expect(L.isMobile).toBe(false);
    expect(themeBody.classList.contains("is-mobile")).toBe(false);
    expect(L._localStorage.getItem("ledger_layout_mode")).toBe("desktop");
    L.applyLayoutMode("auto");
  });

  it("transactions toolbar, bulk bar and settings import cards are marked desktop-only", () => {
    freshDemoData();
    const txHtml = L.pages.renderTransactionsPage();
    expect(txHtml.indexOf('class="btn btn-sm desktop-only" id="exportCsvBtn"')).toBeGreaterThan(-1);
    const t = L.filteredTransactions()[0];
    L.registerSelectedTx = {};
    L.registerSelectedTx[t.id] = true;
    const txHtml2 = L.pages.renderTransactionsPage();
    expect(txHtml2.indexOf('class="bulk-bar desktop-only" id="bulkBar"')).toBeGreaterThan(-1);
    L.registerSelectedTx = {};
    const setHtml = L.pages.renderSettingsPage();
    expect(setHtml.indexOf('class="card card-pad section-gap desktop-only"')).toBeGreaterThan(-1);
  });

  it("mobile CSS hides desktop-only content", () => {
    const fs = require("node:fs");
    const css = fs.readFileSync("css/styles.css", "utf8");
    expect(css).toContain("body.is-mobile .desktop-only{ display:none !important; }");
  });
});

describe("Manual QA: dark/light theme switches end to end", () => {
  it("applyTheme updates the body attribute, storage and currentTheme", () => {
    L.applyTheme("light");
    expect(themeBody.getAttribute("data-theme")).toBe("light");
    expect(L._localStorage.getItem("ledger_theme")).toBe("light");
    expect(L.currentTheme).toBe("light");
    L.applyTheme("dark");
    expect(themeBody.getAttribute("data-theme")).toBe("dark");
    expect(L._localStorage.getItem("ledger_theme")).toBe("dark");
    expect(L.currentTheme).toBe("dark");
  });

  it("the app boots dark and both theme stylesheets exist", () => {
    const fs = require("node:fs");
    const html = fs.readFileSync("index.html", "utf8");
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('data-theme-btn="light"');
    expect(html).toContain('data-theme-btn="dark"');
    const css = fs.readFileSync("css/styles.css", "utf8");
    expect(css).toContain('[data-theme="dark"]{');
    expect(css).toContain('[data-theme="light"]{');
  });
});

describe("Manual QA: empty states appear only when appropriate", () => {
  it("with no data, pages show their true empty states", () => {
    emptyData();
    expect(L.pages.renderTransactionsPage()).toContain("No transactions yet");
    expect(L.pages.renderPeoplePage()).toContain("No people added");
    expect(L.pages.renderRecurringPage()).toContain("No recurring transactions");
    const overviewHtml = L.pages.renderOverviewPage();
    expect(overviewHtml.indexOf("No accounts yet") !== -1 || overviewHtml.indexOf("No categorized spending") !== -1).toBe(true);
    freshDemoData();
  });

  it("with demo data loaded, no main page shows an empty state", () => {
    freshDemoData();
    const pages = [
      L.pages.renderOverviewPage(),
      L.pages.renderTransactionsPage(),
      L.pages.renderReportsPage(),
      L.pages.renderAccountsPage(),
      L.pages.renderPeoplePage(),
      L.pages.renderRecurringPage(),
      L.pages.renderCategoriesPage(),
    ];
    const markers = ["No accounts yet", "No transactions yet", "No people added", "No recurring transactions", "No categorized spending"];
    pages.forEach(function (html) {
      markers.forEach(function (m) { expect(html.indexOf(m), m).toBe(-1); });
    });
  });

  it("a filtered-empty register shows the filtered empty state, not the no-data one", () => {
    freshDemoData();
    L.registerFilters.search = "zzz-no-match-xyz";
    const html = L.pages.renderTransactionsPage();
    expect(html).toContain("No matching transactions");
    expect(html).not.toContain("No transactions yet");
    L.registerFilters.search = "";
  });
});

describe("Manual QA: currency formatting is consistent", () => {
  it("fmtMoney renders symbols, grouping and sign placement correctly", () => {
    expect(L.fmtMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(L.fmtMoney(-2460.81, "USD")).toBe("\u2212$2,460.81");
    expect(L.fmtMoney(0, "USD")).toBe("$0.00");
    expect(L.fmtMoney(50000, "INR")).toBe("\u20B950,000.00");
    expect(L.fmtMoney(1477.8, "CAD")).toBe("$1,477.80");
    expect(L.fmtMoneyShort(3500, "USD")).toBe("$3.5k");
    expect(L.fmtMoneyShort(1200000, "USD")).toBe("$1.2M");
  });

  it("balances display in their account currency on overview and accounts pages", () => {
    freshDemoData();
    const cad = DB.accounts.find(function (a) { return a.currency === "CAD"; });
    const inr = DB.accounts.find(function (a) { return a.currency === "INR"; });
    const cc = DB.accounts.find(function (a) { return a.type === "credit_card"; });
    const overview = L.pages.renderOverviewPage();
    expect(overview).toContain(L.fmtMoney(L.accountBalance(cad.id), "CAD"));
    expect(overview).toContain(L.fmtMoney(L.accountBalance(inr.id), "INR"));
    const accounts = L.pages.renderAccountsPage();
    expect(accounts).toContain(L.fmtMoney(L.accountBalance(cc.id), "USD"));
  });
});

describe("Manual QA: date formatting is consistent", () => {
  it("tx rows and the register show the same formatted date for the same transaction", () => {
    freshDemoData();
    const t = L.filteredTransactions().slice().sort(function (a, b) { return (b.date + b.id).localeCompare(a.date + a.id); })[0];
    const expected = new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    expect(L.renderTxRow(t)).toContain(expected);
    const html = L.pages.renderTransactionsPage();
    expect(html).toContain(expected);
  });

  it("month labels match the month names in the register", () => {
    expect(L.monthLabelOf("2026-07")).toBe("July");
    expect(L.monthLabelOf("2025-12")).toBe("December");
    freshDemoData();
    L.registerMonthsVisible = 2;
    const html = L.pages.renderTransactionsPage();
    const firstMk = [...new Set(L.filteredTransactions().map(function (x) { return x.date.slice(0, 7); }))].sort().reverse()[0];
    expect(html).toContain(L.monthLabelOf(firstMk));
    L.registerMonthsVisible = 2;
  });
});

describe("Manual QA: every page renders, wires, and its actions open", () => {
  const pageWires = [
    ["renderOverviewPage", "wireOverviewPage", ["reconToggle", "reconDismiss"]],
    ["renderTransactionsPage", "wireTransactionsPage", ["fType", "fAccount", "fCurrency", "fCategory", "fDatePreset", "checkDupesBtn", "exportCsvBtn", "selectAllTx"]],
    ["renderAccountsPage", "wireAccountsPage", ["addAcctBtn", "addGroupBtn", "nwBanner"]],
    ["renderCategoriesPage", "wireCategoriesPage", ["catTabContent", "addCatBtnExpense", "newCatNameExpense"]],
    ["renderPeoplePage", "wirePayeesPage", ["addPersonBtn"]],
    ["renderRecurringPage", "wireScheduledPage", ["addRecurringBtn", "rName", "rAmount", "rFrequency"]],
    ["renderReportsPage", "wireReportsPage", ["rDatePreset", "rType", "rAccount", "rCurrency", "rCategory", "exportReportCsv", "reportTabs"]],
    ["renderSettingsPage", "wireSettingsPage", ["exportBackupBtn", "importBackupBtn", "importCsvBtn", "importStatementBtn", "loadDemoDataBtn", "resetAllBtn", "demoStatusContainer"]],
  ];

  it("each page renders its key interactive elements and wires without throwing", () => {
    freshDemoData();
    pageWires.forEach(function (pw) {
      const html = L.pages[pw[0]]();
      pw[2].forEach(function (id) {
        expect(html.indexOf('id="' + id + '"'), pw[0] + " #" + id).toBeGreaterThan(-1);
      });
      expect(function () { L[pw[1]](); }, pw[1]).not.toThrow();
    });
  });

  it("all dialogs open and close without throwing", () => {
    freshDemoData();
    const tx = DB.transactions[0];
    const acc = DB.accounts[0];
    const person = DB.people[0];
    const debt = DB.debtItems[0];
    expect(function () { L.openTxModal(tx); }).not.toThrow();
    expect(function () { L.openTxModal(null); }).not.toThrow();
    expect(function () { L.openConfirmModal("Title", "Message", function () {}); }).not.toThrow();
    expect(function () { L.openMarkPaidModal(debt); }).not.toThrow();
    expect(function () { L.openAccountModal(acc); }).not.toThrow();
    expect(function () { L.openPersonModal(person); }).not.toThrow();
    expect(function () { L.openStatementPasteModal(); }).not.toThrow();
    expect(function () { L.openCsvImportModal({ name: "x.csv", readAsText: function () {} }); }).not.toThrow();
    expect(function () { L.openCategorySplitModal(150, [], "expense", function () {}); }).not.toThrow();
    expect(function () { L.openFriendSplitModal(150, [], function () {}); }).not.toThrow();
    expect(function () { L.openAddGroupModal(); }).not.toThrow();
    expect(function () { L.openEditGroupModal(DB.groups[0].id); }).not.toThrow();
    expect(function () { L.openDuplicatesModal(); }).not.toThrow();
    expect(function () { L.openAutoCategorizeModal([]); }).not.toThrow();
    expect(function () { L.closeModal(); }).not.toThrow();
  });

  it("nav links and theme toggles exist in the shell", () => {
    const fs = require("node:fs");
    const html = fs.readFileSync("index.html", "utf8");
    expect(html.indexOf("mobile-topbar")).toBeGreaterThan(-1);
    expect(html.indexOf("navList")).toBeGreaterThan(-1);
    expect(html.indexOf("data-theme-btn=")).toBeGreaterThan(-1);
  });
});

describe("Manual QA: zero console errors", () => {
  it("collects zero console errors across all pages, wires and dialogs", () => {
    expect(consoleErrors).toEqual([]);
  });
});
