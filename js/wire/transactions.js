(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireTransactionsPage = function(){
  window.Ledger.wireTxRowActions();
  ["fAccount","fCurrency","fType"].forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("change", function(){
      window.Ledger.registerFilters.account = document.getElementById("fAccount").value;
      window.Ledger.registerFilters.currency = document.getElementById("fCurrency").value;
      var prevType = window.Ledger.registerFilters.type;
      window.Ledger.registerFilters.type = document.getElementById("fType").value;
      if(prevType !== window.Ledger.registerFilters.type){
        window.Ledger.registerFilters.category = "all";
        window.Ledger.registerFilters.subcategory = "all";
        window.Ledger.registerFilters.uncategorized = false;
      }
      if(window.Ledger.registerFilters.datePreset !== "custom"){
        window.Ledger.renderPage();
      }
    });
  });
  ["fCategory","fSubcategory"].forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("change", function(){
      if(id === "fCategory"){
        window.Ledger.registerFilters.category = document.getElementById("fCategory").value;
        window.Ledger.registerFilters.subcategory = "all";
        if(window.Ledger.registerFilters.category !== "all") window.Ledger.registerFilters.uncategorized = false;
      } else {
        window.Ledger.registerFilters.subcategory = document.getElementById("fSubcategory").value;
      }
      if(window.Ledger.registerFilters.datePreset !== "custom"){
        window.Ledger.renderPage();
      }
    });
  });
  var fDatePresetEl = document.getElementById("fDatePreset");
  if(fDatePresetEl) fDatePresetEl.addEventListener("change", function(){
    window.Ledger.registerFilters.datePreset = document.getElementById("fDatePreset").value;
    if(window.Ledger.registerFilters.datePreset !== "custom"){
      window.Ledger.renderPage();
    }
  });
  var exportBtn = document.getElementById("exportCsvBtn");
  if(exportBtn) exportBtn.addEventListener("click", window.Ledger.exportCsv);
  var dupesBtn = document.getElementById("checkDupesBtn");
  if(dupesBtn) dupesBtn.addEventListener("click", function(){ window.Ledger.openDuplicatesModal(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-year]"), function(el){
    el.addEventListener("click", function(){ window.Ledger.toggleRegYear(el.getAttribute("data-toggle-year")); });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-toggle-month]"), function(el){
    el.addEventListener("click", function(){ window.Ledger.toggleRegMonth(el.getAttribute("data-toggle-month")); });
  });
  var loadEarlier = document.querySelector("[data-load-earlier]");
  if(loadEarlier) loadEarlier.addEventListener("click", window.Ledger.loadRegEarlierMonths);
  function wireClearFilters(btnId){
    var btn = document.getElementById(btnId);
    if(btn) btn.addEventListener("click", function(){
      window.Ledger.registerFilters = { account:"all", currency:"all", category:"all", subcategory:"all", type:"all", datePreset:"all", dateFrom:"", dateTo:"", search:"", uncategorized:false };
      var gs = document.getElementById("globalSearch"); if(gs) gs.value = "";
      window.Ledger.renderPage();
    });
  }
  wireClearFilters("clearFiltersBtn");
  wireClearFilters("clearFiltersBtn2");

  var uncatBtn = document.getElementById("uncatFilterBtn");
  if(uncatBtn) uncatBtn.addEventListener("click", function(){
    window.Ledger.registerFilters.uncategorized = !window.Ledger.registerFilters.uncategorized;
    if(window.Ledger.registerFilters.uncategorized){
      window.Ledger.registerFilters.category = "all";
      window.Ledger.registerFilters.subcategory = "all";
    }
    window.Ledger.renderPage();
  });

  var autoCatBtn = document.getElementById("autoCategorizeBtn");
  if(autoCatBtn) autoCatBtn.addEventListener("click", function(){
    var uncatTx = window.Ledger.DB.transactions.filter(function(t){
      if(t.type === "transfer" || (t.categorySplits && t.categorySplits.length) || t.category) return false;
      return true;
    });
    if(!uncatTx.length) return;
    window.Ledger.openAutoCategorizeModal(uncatTx);
  });

  var selectAllCb = document.getElementById("selectAllTx");
  if(selectAllCb) selectAllCb.addEventListener("change", function(){
    var visible = window.Ledger.filteredTransactions();
    visible.forEach(function(t){
      if(selectAllCb.checked) window.Ledger.registerSelectedTx[t.id] = true;
      else delete window.Ledger.registerSelectedTx[t.id];
    });
    window.Ledger.renderPage();
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-tx-check]"), function(cb){
    cb.addEventListener("change", function(){
      var txId = cb.getAttribute("data-tx-check");
      if(cb.checked) window.Ledger.registerSelectedTx[txId] = true;
      else delete window.Ledger.registerSelectedTx[txId];
      window.Ledger.renderPage();
    });
  });

  var bulkCatSel = document.getElementById("bulkCat");
  if(bulkCatSel){
    bulkCatSel.addEventListener("change", function(){
      var catId = bulkCatSel.value;
      var bulkSubSel = document.getElementById("bulkSub");
      if(!bulkSubSel) return;
      var subWrap = bulkSubSel.previousElementSibling;
      if(subWrap && subWrap.classList.contains("cd-wrap")) subWrap.style.display = "";
      if(catId && catId !== "__clear__" && window.Ledger.categoryHasSubs(catId)){
        var cat = window.Ledger.findCategory(catId);
        bulkSubSel.innerHTML = '<option value="">No change</option><option value="__clear__">Remove subcategory</option>'
          + (cat ? cat.subs.map(function(s){ return '<option value="'+s.id+'">'+window.Ledger.escapeHtml(s.name)+'</option>'; }).join("") : "");
        bulkSubSel.style.display = "";
        window.Ledger.refreshCustomDropdown(bulkSubSel);
      } else {
        bulkSubSel.innerHTML = '<option value="">No change</option>';
        bulkSubSel.style.display = "none";
        if(subWrap && subWrap.classList.contains("cd-wrap")) subWrap.style.display = "none";
        window.Ledger.refreshCustomDropdown(bulkSubSel);
      }
    });
  }
  var bulkApplyBtn = document.getElementById("bulkApplyBtn");
  if(bulkApplyBtn) bulkApplyBtn.addEventListener("click", function(){
    var catEl = document.getElementById("bulkCat");
    var subEl = document.getElementById("bulkSub");
    var catVal = catEl ? catEl.value : "";
    var subVal = subEl ? subEl.value : "";
    if(!catVal && !subVal) return;
    var selectedIds = Object.keys(window.Ledger.registerSelectedTx);
    if(!selectedIds.length) return;
    var visible = window.Ledger.filteredTransactions();
    var visibleMap = {};
    visible.forEach(function(t){ visibleMap[t.id] = true; });
    var updated = 0;
    selectedIds.forEach(function(txId){
      if(!visibleMap[txId]) return;
      var tx = window.Ledger.DB.transactions.find(function(t){ return t.id === txId; });
      if(!tx || tx.type === "transfer") return;
      var changes = {};
      if(catVal){
        changes.category = catVal === "__clear__" ? "" : catVal;
        if(catVal === "__clear__") changes.subcategory = "";
        changes.categorySplits = null;
      }
      if(subVal) changes.subcategory = subVal === "__clear__" ? "" : subVal;
      window.Ledger.updateTransaction(txId, changes, true);
      updated++;
    });
    window.Ledger.registerSelectedTx = {};
    window.Ledger.saveData();
    window.Ledger.renderPage();
    window.Ledger.showToast(updated + " transaction" + (updated !== 1 ? "s" : "") + " updated");
  });
  var bulkClearBtn = document.getElementById("bulkClearBtn");
  if(bulkClearBtn) bulkClearBtn.addEventListener("click", function(){
    window.Ledger.registerSelectedTx = {};
    window.Ledger.renderPage();
  });

  var bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
  if(bulkDeleteBtn) bulkDeleteBtn.addEventListener("click", function(){
    var selectedIds = Object.keys(window.Ledger.registerSelectedTx);
    if(!selectedIds.length) return;
    window.Ledger.openConfirmModal("Delete " + selectedIds.length + " transaction" + (selectedIds.length !== 1 ? "s" : "") + "?", "This will permanently remove the selected transactions. This cannot be undone.", function(){
      selectedIds.forEach(function(id){
        window.Ledger.deleteTransaction(id, true);
      });
      window.Ledger.registerSelectedTx = {};
      window.Ledger.saveData();
      window.Ledger.renderPage();
      window.Ledger.showToast(selectedIds.length + " transaction" + (selectedIds.length !== 1 ? "s" : "") + " deleted");
    });
  });

  var upcomingLink = document.querySelector(".upcoming-link");
  if(upcomingLink) upcomingLink.addEventListener("click", function(e){ e.preventDefault(); window.Ledger.navigateTo("scheduled"); });

  var fab = document.getElementById("newTxBtn");
  var regCard = document.getElementById("txCard");
  if(fab && regCard){
    var emptyEl = regCard.querySelector(".tx-empty");
    if(emptyEl){ fab.classList.add("fab-hidden"); } else { fab.classList.remove("fab-hidden"); }
  }
};

})();
