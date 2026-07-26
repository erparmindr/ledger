(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   NAVIGATION
   ============================================================ */
window.Ledger.NAV_ITEMS = [
  {id:"overview", label:"Overview", ic:"layout-dashboard"},
  {id:"transactions", label:"Transactions", ic:"list"},
  {id:"accounts", label:"Accounts", ic:"wallet"},
  {id:"reports", label:"Reports", ic:"pie-chart"},
  {id:"categories", label:"Categories", ic:"tag"},
  {id:"payees", label:"Payees", ic:"users"},
  {id:"scheduled", label:"Scheduled", ic:"repeat"},
  {id:"settings", label:"Settings", ic:"settings"}
];

window.Ledger.renderNav = function(){
  var nav = document.getElementById("navList");
  nav.innerHTML = window.Ledger.NAV_ITEMS.map(function(item){
    return '<button class="nav-item ' + (window.Ledger.currentPage===item.id?'active':'') + '" data-nav="' + item.id + '">' +
      '<span class="ic"><i data-lucide="' + item.ic + '"></i></span>' + item.label + '</button>';
  }).join("");
  window.Ledger.refreshIcons();
  Array.prototype.forEach.call(nav.querySelectorAll("[data-nav]"), function(btn){
    btn.addEventListener("click", function(){
      window.Ledger.navigateTo(btn.getAttribute("data-nav"));
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("sidebarBackdrop").classList.remove("show");
    });
  });
};

window.Ledger.getPageSubtitle = function(page){
  if(page === "overview"){
    var d = new Date();
    return d.toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric", year:"numeric"});
  }
  if(page === "transactions"){
    var txCount = window.Ledger.DB.transactions.length;
    return txCount + " transaction" + (txCount !== 1 ? "s" : "");
  }
  if(page === "accounts"){
    var aCount = window.Ledger.DB.accounts.length;
    return aCount + " account" + (aCount !== 1 ? "s" : "");
  }
  return "";
};

window.Ledger.navigateTo = function(page){
  window.Ledger.currentPage = page;
  localStorage.setItem("ledger_page", page);
  var navItem = window.Ledger.NAV_ITEMS.find(function(n){ return n.id===page; });
  document.getElementById("pageTitle").textContent = navItem ? navItem.label : page;
  document.getElementById("pageSubtitle").textContent = window.Ledger.getPageSubtitle(page);
  document.getElementById("globalSearchWrap").style.display = (page === "transactions") ? "flex" : "none";
  var fab = document.getElementById("newTxBtn");
  if(fab && page !== "transactions") fab.classList.remove("fab-hidden");
  window.Ledger.renderNav();
  window.Ledger.renderPage();
};

/* ============================================================
   PAGE ROUTER
   ============================================================ */
window.Ledger.renderPage = function(){
  var c = document.getElementById("pageContent");
  if(window.Ledger.currentPage === "overview") c.innerHTML = window.Ledger.pages.renderOverviewPage();
  else if(window.Ledger.currentPage === "transactions") c.innerHTML = window.Ledger.pages.renderTransactionsPage();
  else if(window.Ledger.currentPage === "accounts") c.innerHTML = window.Ledger.pages.renderAccountsPage();
  else if(window.Ledger.currentPage === "reports") c.innerHTML = window.Ledger.pages.renderReportsPage();
  else if(window.Ledger.currentPage === "categories") c.innerHTML = window.Ledger.pages.renderCategoriesPage();
  else if(window.Ledger.currentPage === "payees") c.innerHTML = window.Ledger.pages.renderPeoplePage();
  else if(window.Ledger.currentPage === "scheduled") c.innerHTML = window.Ledger.pages.renderRecurringPage();
  else if(window.Ledger.currentPage === "settings") c.innerHTML = window.Ledger.pages.renderSettingsPage();
  window.Ledger.wirePageEvents();
  window.Ledger.refreshIcons();
  window.Ledger.initCustomDropdowns();
  if(window.Ledger.initDatePickers) window.Ledger.initDatePickers();

  /* ---- Custom date range picker popover ---- */
  if(window.Ledger.currentPage === "transactions" || window.Ledger.currentPage === "reports"){
    var isTx = window.Ledger.currentPage === "transactions";
    var presetId = isTx ? "fDatePreset" : "rDatePreset";
    var stateObj = isTx ? "registerFilters" : "reportState";
    var presetSel = document.getElementById(presetId);
    if(presetSel){
      var cdWrap = presetSel.previousElementSibling;
      if(cdWrap && cdWrap.classList.contains("cd-wrap")){
        var cdList = cdWrap.querySelector(".cd-list");
        var customItem = cdList.querySelector('[data-val="custom"]');
        if(customItem){
          customItem.addEventListener("click", function(){
            var st = window.Ledger[stateObj];
            window.Ledger.openDateRangePicker({
              from: st.dateFrom || "",
              to: st.dateTo || "",
              anchorEl: cdWrap,
              onApply: function(f, t){
                st.dateFrom = f;
                st.dateTo = t;
                st.datePreset = "custom";
                window.Ledger.renderPage();
              }
            });
          });
        }
      }
    }
  }
};

/* ============================================================
   EVENT WIRING — thin dispatcher (delegates to wire/*.js)
   ============================================================ */
window.Ledger.wirePageEvents = function(){
  var btn = document.getElementById("newTxBtn");
  if(btn) btn.onclick = function(){ window.Ledger.openTxModal(null); };

  var page = window.Ledger.currentPage;
  if(page === "overview" && window.Ledger.wireOverviewPage) window.Ledger.wireOverviewPage();
  else if(page === "transactions" && window.Ledger.wireTransactionsPage) window.Ledger.wireTransactionsPage();
  else if(page === "accounts" && window.Ledger.wireAccountsPage) window.Ledger.wireAccountsPage();
  else if(page === "categories" && window.Ledger.wireCategoriesPage) window.Ledger.wireCategoriesPage();
  else if(page === "payees" && window.Ledger.wirePayeesPage) window.Ledger.wirePayeesPage();
  else if(page === "reports" && window.Ledger.wireReportsPage) window.Ledger.wireReportsPage();
  else if(page === "scheduled" && window.Ledger.wireScheduledPage) window.Ledger.wireScheduledPage();
  else if(page === "settings" && window.Ledger.wireSettingsPage) window.Ledger.wireSettingsPage();
};

window.Ledger.wireTxRowActions = function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-tx]"), function(b){
    b.addEventListener("click", function(){
      var t = window.Ledger.DB.transactions.find(function(x){ return x.id === b.getAttribute("data-edit-tx"); });
      if(t) window.Ledger.openTxModal(t);
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-tx]"), function(b){
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-del-tx");
      var t = window.Ledger.DB.transactions.find(function(x){ return x.id === id; });
      var isLinked = t && t.linkId;
      var msg = isLinked
        ? "This is one half of a cross-currency transfer. Deleting it will remove both linked entries. This can't be undone."
        : "This can't be undone.";
      window.Ledger.openConfirmModal("Delete transaction?", msg, function(){
        if(isLinked){
          window.Ledger.deleteTransactionsByLink(t.linkId);
        } else {
          window.Ledger.deleteTransaction(id);
        }
        window.Ledger.showToast(isLinked ? "Both linked entries deleted" : "Transaction deleted");
      });
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-kebab]"), function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var id = btn.getAttribute("data-kebab");
      var menu = document.getElementById("kebab-" + id);
      if(!menu) return;
      var wasOpen = menu.classList.contains("open");
      document.querySelectorAll(".kebab-menu.open").forEach(function(m){ m.classList.remove("open"); });
      if(!wasOpen) menu.classList.add("open");
    });
  });

  document.addEventListener("click", function(){
    document.querySelectorAll(".kebab-menu.open").forEach(function(m){ m.classList.remove("open"); });
  });
};

/* ============================================================
   GLOBAL SEARCH
   ============================================================ */
document.getElementById("globalSearch") && document.getElementById("globalSearch").addEventListener("input", function(e){
  window.Ledger.registerFilters.search = e.target.value;
  window.Ledger.renderPage();
});

/* ============================================================
   INIT
   ============================================================ */
window.Ledger.__LEDGER_INIT__ = function(){
  var savedTheme = localStorage.getItem("ledger_theme");
  if(savedTheme) window.Ledger.currentTheme = savedTheme;
  window.Ledger.applyTheme(window.Ledger.currentTheme);

  var savedPage = localStorage.getItem("ledger_page");
  if(savedPage && window.Ledger.NAV_ITEMS.some(function(n){ return n.id === savedPage; })){
    window.Ledger.currentPage = savedPage;
  }
  var navItem = window.Ledger.NAV_ITEMS.find(function(n){ return n.id === window.Ledger.currentPage; });
  document.getElementById("pageTitle").textContent = navItem ? navItem.label : "Overview";
  document.getElementById("pageSubtitle").textContent = window.Ledger.getPageSubtitle(window.Ledger.currentPage);
  document.getElementById("globalSearchWrap").style.display = (window.Ledger.currentPage === "transactions") ? "flex" : "none";

  window.Ledger.renderNav();
};

window.Ledger.applyTheme = function(t){
  window.Ledger.currentTheme = t;
  localStorage.setItem("ledger_theme", t);
  document.body.setAttribute("data-theme", t);
  Array.prototype.forEach.call(document.querySelectorAll("[data-theme-btn]"), function(b){
    b.classList.toggle("active", b.getAttribute("data-theme-btn") === t);
  });
};

document.addEventListener("DOMContentLoaded", function(){
  document.getElementById("hamburgerBtn").addEventListener("click", function(){
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarBackdrop").classList.add("show");
  });
  document.getElementById("sidebarBackdrop").addEventListener("click", function(){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarBackdrop").classList.remove("show");
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-theme-btn]"), function(b){
    b.addEventListener("click", function(){ window.Ledger.applyTheme(b.getAttribute("data-theme-btn")); });
  });

  function afterStorageReady(){
    window.Ledger.autoPostRecurring();
    window.Ledger.renderPage();
  }
  if(window.Ledger.Storage){
    window.Ledger.Storage.init().then(function(){
      afterStorageReady();
    });
  } else {
    afterStorageReady();
  }

  window.Ledger.__LEDGER_INIT__();

  document.addEventListener("click", function(){
    document.querySelectorAll(".pill-dropdown.open").forEach(function(x){ x.classList.remove("open"); });
  });

  document.getElementById("pageContent").addEventListener("click", function(e){
    var trigger = e.target.closest(".pill-trigger");
    if(trigger){
      e.stopPropagation();
      var dd = trigger.closest(".pill-dropdown");
      var wasOpen = dd.classList.contains("open");
      document.querySelectorAll(".pill-dropdown.open").forEach(function(x){ x.classList.remove("open"); });
      if(!wasOpen) dd.classList.add("open");
      return;
    }
    var opt = e.target.closest(".pill-option");
    if(opt){
      e.stopPropagation();
      var dd2 = opt.closest(".pill-dropdown");
      var key = dd2.getAttribute("data-pill-dropdown");
      window.Ledger.overviewState[key] = opt.getAttribute("data-pill-val");
      window.Ledger.saveOverviewState();
      window.Ledger.renderPage();
      return;
    }
  });

  if("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("./sw.js").catch(function(err){
        console.warn("Service worker registration failed:", err);
      });
    });
  }
});

})();
