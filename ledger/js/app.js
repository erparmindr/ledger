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
  document.getElementById("pageTitle").textContent = window.Ledger.NAV_ITEMS.find(function(n){ return n.id===page; }).label;
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
  else if(window.Ledger.currentPage === "transactions") c.innerHTML = window.Ledger.pages.renderRegisterPage();
  else if(window.Ledger.currentPage === "accounts") c.innerHTML = window.Ledger.pages.renderAccountsPage();
  else if(window.Ledger.currentPage === "reports") c.innerHTML = window.Ledger.pages.renderReportsPage();
  else if(window.Ledger.currentPage === "categories") c.innerHTML = window.Ledger.pages.renderCategoriesPage();
  else if(window.Ledger.currentPage === "payees") c.innerHTML = window.Ledger.pages.renderPeoplePage();
  else if(window.Ledger.currentPage === "scheduled") c.innerHTML = window.Ledger.pages.renderRecurringPage();
  else if(window.Ledger.currentPage === "settings") c.innerHTML = window.Ledger.pages.renderSettingsPage();
  window.Ledger.wirePageEvents();
  window.Ledger.refreshIcons();
  window.Ledger.initCustomDropdowns();
};

/* ============================================================
   EVENT WIRING (per-page, called after every render)
   ============================================================ */
window.Ledger.wirePageEvents = function(){
  var btn = document.getElementById("newTxBtn");
  if(btn) btn.onclick = function(){ window.Ledger.openTxModal(null); };

  if(window.Ledger.currentPage === "overview"){
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav-link]"), function(el){
      el.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation(); window.Ledger.navigateTo(el.getAttribute("data-nav-link")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-link-pending]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.openLinkTransferModal(b.getAttribute("data-link-pending")); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-link-refund]"), function(b){
      b.addEventListener("click", function(){
        var refundId = b.getAttribute("data-link-refund");
        var refund = window.Ledger.DB.transactions.find(function(t){ return t.id === refundId; });
        if(refund) window.Ledger.openTxModal(refund);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-acct-click]"), function(el){
      el.addEventListener("click", function(){
        var acctId = el.getAttribute("data-acct-click");
        window.Ledger.registerFilters.account = acctId;
        window.Ledger.navigateTo("transactions");
      });
    });
    window.Ledger.wireTxRowActions();
  }

  if(window.Ledger.currentPage === "transactions"){
    window.Ledger.wireTxRowActions();
    ["fAccount","fCurrency","fSubcategory","fType","fDatePreset"].forEach(function(id){
      var el = document.getElementById(id);
      if(!el) return;
      el.addEventListener("change", function(){
        window.Ledger.registerFilters.account = document.getElementById("fAccount").value;
        window.Ledger.registerFilters.currency = document.getElementById("fCurrency").value;
        window.Ledger.registerFilters.subcategory = document.getElementById("fSubcategory").value;
        window.Ledger.registerFilters.type = document.getElementById("fType").value;
        window.Ledger.registerFilters.datePreset = document.getElementById("fDatePreset").value;
        window.Ledger.renderPage();
      });
    });
    var dFrom = document.getElementById("fDateFrom"), dTo = document.getElementById("fDateTo");
    if(dFrom) dFrom.addEventListener("change", function(){ window.Ledger.registerFilters.dateFrom = dFrom.value; window.Ledger.renderPage(); });
    if(dTo) dTo.addEventListener("change", function(){ window.Ledger.registerFilters.dateTo = dTo.value; window.Ledger.renderPage(); });
    var exportBtn = document.getElementById("exportCsvBtn");
    if(exportBtn) exportBtn.addEventListener("click", window.Ledger.exportCsv);
    function wireClearFilters(btnId){
      var btn = document.getElementById(btnId);
      if(btn) btn.addEventListener("click", function(){
        window.Ledger.registerFilters = { account:"all", currency:"all", category:"all", subcategory:"all", type:"all", datePreset:"all", dateFrom:"", dateTo:"", search:"" };
        var gs = document.getElementById("globalSearch"); if(gs) gs.value = "";
        window.Ledger.renderPage();
      });
    }
    wireClearFilters("clearFiltersBtn");
    wireClearFilters("clearFiltersBtn2");

    /* Category combobox — floating popover portal */
    var cbWrap = document.getElementById("cbCategory");
    if(cbWrap){
      var cbTrigger = cbWrap.querySelector(".cb-trigger");
      var cbDropdown = cbWrap.querySelector(".cb-dropdown");
      var cbSearch = cbWrap.querySelector(".cb-search");
      var cbScroll = cbWrap.querySelector(".cb-scroll");
      var focusedIdx = -1;
      var cbScrollHandler = null;
      var cbResizeHandler = null;

      /* Remove previous global listeners to prevent leaks */
      if(window.Ledger._cbDocClick){ document.removeEventListener("click", window.Ledger._cbDocClick); }
      if(window.Ledger._cbDocKeydown){ document.removeEventListener("keydown", window.Ledger._cbDocKeydown); }

      function cbVisible(){ var v=[]; var all=cbScroll.querySelectorAll(".cb-item"); for(var i=0;i<all.length;i++){if(all[i].style.display!=="none")v.push(all[i]);}return v; }
      function cbFocus(){ var v=cbVisible(); for(var i=0;i<v.length;i++){v[i].classList.toggle("focused",i===focusedIdx);} }
      function cbFilter(q){ q=q.toLowerCase().trim(); var items=cbScroll.querySelectorAll(".cb-item"); for(var i=0;i<items.length;i++){var lbl=items[i].querySelector(".cb-item-label").textContent.toLowerCase();items[i].style.display=(!q||lbl.indexOf(q)!==-1)?"":"none";} var rs=cbScroll.querySelector(".cb-section-recent");var as=cbScroll.querySelector(".cb-section-all");if(rs){var ri=rs.querySelectorAll(".cb-item");var hv=false;for(var j=0;j<ri.length;j++){if(ri[j].style.display!=="none"){hv=true;break;}}rs.style.display=hv?"":"none";}if(as){var ai=as.querySelectorAll(".cb-item");var ha=false;for(var k=0;k<ai.length;k++){if(ai[k].style.display!=="none"){ha=true;break;}}as.style.display=ha?"":"none";} focusedIdx=-1;cbFocus(); }
      function cbPosition(){
        var r=cbTrigger.getBoundingClientRect();
        var ddW=320; var vpW=window.innerWidth; var vpH=window.innerHeight;
        var ddH=Math.min(340, vpH-r.height-16);
        var left=r.left; if(left+ddW>vpW-8) left=vpW-ddW-8; if(left<8) left=8;
        var top=r.bottom+4; if(top+ddH>vpH-8){ top=r.top-ddH-4; }
        if(top<8) top=8;
        cbDropdown.style.left=left+"px";
        cbDropdown.style.top=top+"px";
        cbDropdown.style.width=ddW+"px";
        cbDropdown.style.maxHeight=ddH+"px";
      }
      function cbOpen(){
        cbWrap.classList.add("open"); cbWrap.setAttribute("aria-expanded","true");
        cbDropdown.classList.add("is-portal");
        document.body.appendChild(cbDropdown);
        cbDropdown.style.display="block";
        cbPosition();
        cbSearch.value=""; cbFilter(""); focusedIdx=-1; cbFocus();
        setTimeout(function(){cbSearch.focus();},10);
        cbScrollHandler=function(){ if(cbWrap.classList.contains("open")) cbClose(); };
        cbResizeHandler=function(){ if(cbWrap.classList.contains("open")) cbPosition(); };
        window.addEventListener("scroll",cbScrollHandler,true);
        window.addEventListener("resize",cbResizeHandler);
      }
      function cbClose(){
        cbWrap.classList.remove("open"); cbWrap.setAttribute("aria-expanded","false");
        cbDropdown.classList.remove("is-portal");
        cbDropdown.style.display=""; cbDropdown.style.left=""; cbDropdown.style.top="";
        cbDropdown.style.width=""; cbDropdown.style.maxHeight="";
        cbWrap.appendChild(cbDropdown);
        focusedIdx=-1; var items=cbScroll.querySelectorAll(".cb-item");for(var i=0;i<items.length;i++)items[i].classList.remove("focused");
        if(cbScrollHandler){ window.removeEventListener("scroll",cbScrollHandler,true); cbScrollHandler=null; }
        if(cbResizeHandler){ window.removeEventListener("resize",cbResizeHandler); cbResizeHandler=null; }
      }
      function cbSelect(val){ window.Ledger.registerFilters.category=val; window.Ledger.registerFilters.subcategory="all"; cbClose(); window.Ledger.renderPage(); }
      cbTrigger.addEventListener("click",function(e){e.stopPropagation();cbWrap.classList.contains("open")?cbClose():cbOpen();});
      cbSearch.addEventListener("input",function(){cbFilter(cbSearch.value);});
      cbSearch.addEventListener("keydown",function(e){var v=cbVisible();if(e.key==="ArrowDown"){e.preventDefault();focusedIdx=Math.min(focusedIdx+1,v.length-1);cbFocus();}else if(e.key==="ArrowUp"){e.preventDefault();focusedIdx=Math.max(focusedIdx-1,0);cbFocus();}else if(e.key==="Enter"){e.preventDefault();if(focusedIdx>=0&&v[focusedIdx])cbSelect(v[focusedIdx].getAttribute("data-val"));}else if(e.key==="Escape"){e.preventDefault();cbClose();cbTrigger.focus();}});
      cbScroll.addEventListener("click",function(e){var item=e.target.closest(".cb-item");if(item)cbSelect(item.getAttribute("data-val"));});
      window.Ledger._cbDocClick = function(e){if(cbWrap.classList.contains("open")&&!cbWrap.contains(e.target)&&!cbDropdown.contains(e.target))cbClose();};
      window.Ledger._cbDocKeydown = function(e){if(e.key==="Escape"&&cbWrap.classList.contains("open")){cbClose();cbTrigger.focus();}};
      document.addEventListener("click", window.Ledger._cbDocClick);
      document.addEventListener("keydown", window.Ledger._cbDocKeydown);
    }

    /* Hide FAB when register is empty (no transactions or no matches) */
    var fab = document.getElementById("newTxBtn");
    var regCard = document.getElementById("registerCard");
    if(fab && regCard){
      var emptyEl = regCard.querySelector(".register-empty");
      if(emptyEl){ fab.classList.add("fab-hidden"); } else { fab.classList.remove("fab-hidden"); }
    }
  }

  if(window.Ledger.currentPage === "accounts"){
    el = document.getElementById("addAcctBtn"); if(el) el.addEventListener("click", function(){ window.Ledger.openAccountModal(null); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-edit-acct]"), function(b){
      b.addEventListener("click", function(e){ e.stopPropagation(); window.Ledger.openAccountModal(window.Ledger.findAccount(b.getAttribute("data-edit-acct"))); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-archive-acct]"), function(b){
      b.addEventListener("click", function(e){
        e.stopPropagation();
        var id = b.getAttribute("data-archive-acct");
        var a = window.Ledger.findAccount(id);
        window.Ledger.openConfirmModal("Archive account?", "Archive \"" + (a?a.name:"") + "\"? It will be hidden from active lists but all transactions stay intact. You can unarchive it later from the Archived section.", function(){
          window.Ledger.archiveAccount(id);
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-unarchive-acct]"), function(b){
      b.addEventListener("click", function(e){
        e.stopPropagation();
        var id = b.getAttribute("data-unarchive-acct");
        var a = window.Ledger.findAccount(id);
        if(a){ window.Ledger.unarchiveAccount(id); }
      });
    });
  }

  if(window.Ledger.currentPage === "categories"){
    // Tab switching
    Array.prototype.forEach.call(document.querySelectorAll("[data-cat-tab]"), function(btn){
      btn.addEventListener("click", function(){
        window.Ledger._catTab = btn.getAttribute("data-cat-tab");
        window.Ledger.renderPage();
      });
    });
    // Add category
    ["addCatBtnExpense","addCatBtnIncome","addCatBtnTransfer"].forEach(function(btnId){
      var btn = document.getElementById(btnId);
      if(btn) btn.addEventListener("click", function(){
        var type = btnId === "addCatBtnExpense" ? "expense" : btnId === "addCatBtnIncome" ? "income" : "transfer";
        var inputId = "newCatName" + type.charAt(0).toUpperCase() + type.slice(1);
        var input = document.getElementById(inputId);
        var name = input ? input.value.trim() : "";
        if(!name){ window.Ledger.showToast("Enter a category name"); return; }
        window.Ledger.addCategory(type, name);
      });
    });
    // Enter key to add
    ["newCatNameExpense","newCatNameIncome","newCatNameTransfer"].forEach(function(inputId){
      var el = document.getElementById(inputId);
      if(el) el.addEventListener("keydown", function(e){
        if(e.key === "Enter"){
          var type = inputId.replace("newCatName","");
          var btnId = "addCatBtn" + type;
          var btn = document.getElementById(btnId);
          if(btn) btn.click();
        }
      });
    });
    // Add subcategory
    Array.prototype.forEach.call(document.querySelectorAll("[data-add-sub]"), function(b){
      b.addEventListener("click", function(){
        var catId = b.getAttribute("data-add-sub");
          window.Ledger.openTextPromptModal("Add subcategory", "Subcategory name", "", function(name){
            window.Ledger.addSubcategory(catId, name);
          });
      });
    });
    // Rename category
    Array.prototype.forEach.call(document.querySelectorAll("[data-rename-cat]"), function(b){
      b.addEventListener("click", function(){
        var catId = b.getAttribute("data-rename-cat");
        var cat = window.Ledger.DB.categories.find(function(c){ return c.id===catId; });
        if(!cat) return;
        window.Ledger.openTextPromptModal("Rename category", "Category name", cat.name, function(name){
          window.Ledger.renameCategory(catId, name);
        });
      });
    });
    // Delete category (with usage warning)
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-cat]"), function(b){
      b.addEventListener("click", function(){
        var catId = b.getAttribute("data-del-cat");
        var cat = window.Ledger.DB.categories.find(function(c){ return c.id===catId; });
        // Count transactions using this category
        var usage = 0;
        window.Ledger.DB.transactions.forEach(function(t){
          if(t.categorySplits && t.categorySplits.length){
            if(t.categorySplits.some(function(s){ return s.categoryId === catId; })) usage++;
          } else if(t.category === catId) usage++;
        });
        var msg = usage > 0
          ? 'This category is used by ' + usage + ' transaction' + (usage !== 1 ? 's' : '') + '. Deleting it won\'t remove those transactions, but the category will show as missing in old entries. Continue?'
          : 'Transactions using this category will keep working but it won\'t appear in new-transaction suggestions. Continue?';
        window.Ledger.openConfirmModal("Delete " + (cat ? cat.name : "category") + "?", msg, function(){
          window.Ledger.deleteCategory(catId);
        });
      });
    });
    // Rename subcategory
    Array.prototype.forEach.call(document.querySelectorAll("[data-rename-sub]"), function(b){
      b.addEventListener("click", function(){
        var parts = b.getAttribute("data-rename-sub").split("|");
        var cat = window.Ledger.DB.categories.find(function(c){ return c.id===parts[0]; });
        if(!cat) return;
        var sub = cat.subs.find(function(s){ return s.id===parts[1]; });
        if(!sub) return;
        window.Ledger.openTextPromptModal("Rename subcategory", "Subcategory name", sub.name, function(name){
          window.Ledger.renameSubcategory(parts[0], parts[1], name);
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-sub]"), function(b){
      b.addEventListener("click", function(){
        var parts = b.getAttribute("data-del-sub").split("|");
        var cat = window.Ledger.DB.categories.find(function(c){ return c.id===parts[0]; });
        if(!cat) return;
        window.Ledger.openConfirmModal("Delete subcategory?", "", function(){
          window.Ledger.deleteSubcategory(parts[0], parts[1]);
        });
      });
    });
  }

  if(window.Ledger.currentPage === "payees"){
    document.getElementById("addPersonBtn").addEventListener("click", function(){ window.Ledger.openPersonModal(null); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-edit-person]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.openPersonModal(window.Ledger.findPerson(b.getAttribute("data-edit-person"))); });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-person]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-person");
        window.Ledger.openConfirmModal("Delete person?", "Existing transfers referencing them will remain but show as a missing person. Continue?", function(){
          window.Ledger.deletePerson(id);
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-mark-paid]"), function(b){
      b.addEventListener("click", function(){
        var debtId = b.getAttribute("data-mark-paid");
        var d = window.Ledger.DB.debtItems.find(function(x){ return x.id === debtId; });
        if(!d) return;
        window.Ledger.openMarkPaidModal(d);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".assign-pending-sel"), function(sel){
      sel.addEventListener("change", function(){
        var debtId = sel.getAttribute("data-debt-id");
        var personId = sel.value;
        if(!personId) return;
        var d = window.Ledger.DB.debtItems.find(function(x){ return x.id === debtId; });
        if(d){
          window.Ledger.updateDebtItem(debtId, { personId: personId, status: "open" });
          window.Ledger.showToast("Assigned to " + ((window.Ledger.findPerson(personId)||{}).name||"person"));
        }
      });
    });
  }

  if(window.Ledger.currentPage === "reports"){
    ["rDatePreset","rAccount","rCurrency","rCategory"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.addEventListener("change", function(){
        window.Ledger.reportState.datePreset = document.getElementById("rDatePreset").value;
        window.Ledger.reportState.account = document.getElementById("rAccount").value;
        window.Ledger.reportState.currency = document.getElementById("rCurrency").value;
        window.Ledger.reportState.category = document.getElementById("rCategory").value;
        if(id === "rCategory") window.Ledger.reportState.category = el.value;
        window.Ledger.renderPage();
      });
    });
    var rFrom = document.getElementById("rDateFrom");
    var rTo = document.getElementById("rDateTo");
    if(rFrom) rFrom.addEventListener("change", function(){ window.Ledger.reportState.dateFrom = rFrom.value; window.Ledger.renderPage(); });
    if(rTo) rTo.addEventListener("change", function(){ window.Ledger.reportState.dateTo = rTo.value; window.Ledger.renderPage(); });
    var rSearch = document.getElementById("rSearch");
    if(rSearch) rSearch.addEventListener("input", function(){ window.Ledger.reportState.search = rSearch.value; });
    Array.prototype.forEach.call(document.querySelectorAll("[data-rtab]"), function(b){
      b.addEventListener("click", function(){ window.Ledger.reportState.tab = b.getAttribute("data-rtab"); window.Ledger.renderPage(); });
    });
    var exportReportCsv = document.getElementById("exportReportCsv");
    if(exportReportCsv) exportReportCsv.addEventListener("click", window.Ledger.exportCsv);
  }

  if(window.Ledger.currentPage === "scheduled"){
    document.getElementById("addRecurringBtn").addEventListener("click", function(){
      var name = document.getElementById("rName").value.trim();
      var amount = parseFloat(document.getElementById("rAmount").value);
      var frequency = document.getElementById("rFrequency").value;
      var startDate = document.getElementById("rStartDate").value;
      var type = document.getElementById("rType").value;
      var account = document.getElementById("rAccount").value;
      if(!name || !amount || amount<=0 || !startDate || !account){ window.Ledger.showToast("Fill in all fields"); return; }
      window.Ledger.addRecurring({ id:window.Ledger.uid(), name:name, amount:amount, frequency:frequency, startDate:startDate, type:type, account:account });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-confirm-recurring]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-confirm-recurring");
        var r = window.Ledger.DB.recurring.find(function(x){ return x.id===id; });
        if(!r) return;
        var acc = window.Ledger.findAccount(r.account);
        window.Ledger.addTransaction({
          id:window.Ledger.uid(), type:r.type, date:window.Ledger.todayISO(), amount:r.amount, desc:r.name,
          notes:"Posted from recurring item", account:r.account, category:"", subcategory:"", created:Date.now()
        });
        if(r.frequency === "weekly" || r.frequency === "biweekly"){
          var step = r.frequency === "weekly" ? 7 : 14;
          var d = new Date(r.startDate + "T00:00:00");
          while(d <= new Date(window.Ledger.todayISO()+"T00:00:00")){ d.setDate(d.getDate() + step); }
          r.startDate = window.Ledger.todayISOFromDate(d);
        } else {
          var d2 = new Date(r.startDate + "T00:00:00");
          d2.setMonth(d2.getMonth() + 1);
          r.startDate = window.Ledger.todayISOFromDate(d2);
        }
        window.Ledger.saveData();
        window.Ledger.renderPage();
        window.Ledger.showToast(r.name + " posted to " + (acc?acc.name:"account"));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-del-recurring]"), function(b){
      b.addEventListener("click", function(){
        var id = b.getAttribute("data-del-recurring");
        window.Ledger.deleteRecurring(id);
      });
    });
  }

  if(window.Ledger.currentPage === "settings"){
    var el;
    el = document.getElementById("exportBackupBtn"); if(el) el.addEventListener("click", window.Ledger.exportBackup);
    el = document.getElementById("importBackupBtn"); if(el) el.addEventListener("click", function(){ document.getElementById("importBackupFile").click(); });
    el = document.getElementById("importBackupFile"); if(el) el.addEventListener("change", function(e){
      if(e.target.files[0]) window.Ledger.importBackupFile(e.target.files[0]);
      e.target.value = "";
    });
    el = document.getElementById("importCsvBtn"); if(el) el.addEventListener("click", function(){ document.getElementById("importCsvFile").click(); });
    el = document.getElementById("importCsvFile"); if(el) el.addEventListener("change", function(e){
      if(e.target.files[0]) window.Ledger.openCsvImportModal(e.target.files[0]);
      e.target.value = "";
    });
    el = document.getElementById("importStatementBtn"); if(el) el.addEventListener("click", function(){ window.Ledger.openStatementPasteModal(); });
    el = document.getElementById("resetAllBtn"); if(el) el.addEventListener("click", function(){
      window.Ledger.openConfirmModal(
        "Reset all data?",
        "This will permanently delete all accounts, transactions, people, categories and recurring items from this browser. Export a backup first if you want to keep anything. This cannot be undone.",
        function(){
          window.Ledger.replaceAllData(window.Ledger.defaultData());
          window.Ledger.navigateTo("overview");
          window.Ledger.showToast("All data cleared — fresh start");
        }
      );
    });
  }
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
  // Restore theme from localStorage
  var savedTheme = localStorage.getItem("ledger_theme");
  if(savedTheme) window.Ledger.currentTheme = savedTheme;
  window.Ledger.applyTheme(window.Ledger.currentTheme);

  // Restore page from localStorage
  var savedPage = localStorage.getItem("ledger_page");
  if(savedPage && window.Ledger.NAV_ITEMS.some(function(n){ return n.id === savedPage; })){
    window.Ledger.currentPage = savedPage;
  }
  var navItem = window.Ledger.NAV_ITEMS.find(function(n){ return n.id === window.Ledger.currentPage; });
  document.getElementById("pageTitle").textContent = navItem ? navItem.label : "Overview";
  document.getElementById("pageSubtitle").textContent = window.Ledger.getPageSubtitle(window.Ledger.currentPage);
  document.getElementById("globalSearchWrap").style.display = (window.Ledger.currentPage === "transactions") ? "flex" : "none";

  window.Ledger.renderNav();
  window.Ledger.renderPage();
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

  // Init storage layer (async: migrates localStorage → IDB if needed)
  // DB is already populated from localStorage by store.js, so UI renders immediately.
  // If IDB returns different data, we hot-swap and re-render.
  if(window.Ledger.Storage){
    window.Ledger.Storage.init().then(function(){
      window.Ledger.renderPage();
    });
  }

  window.Ledger.__LEDGER_INIT__();

  /* Close pill dropdowns when clicking outside (once) */
  document.addEventListener("click", function(){
    document.querySelectorAll(".pill-dropdown.open").forEach(function(x){ x.classList.remove("open"); });
  });

  /* Pill dropdown: event delegation (once) */
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
