(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireReportsPage = function(){
  ["rDatePreset","rAccount","rCurrency","rType"].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener("change", function(){
      window.Ledger.reportState.datePreset = document.getElementById("rDatePreset").value;
      window.Ledger.reportState.account = document.getElementById("rAccount").value;
      window.Ledger.reportState.currency = document.getElementById("rCurrency").value;
      var prevType = window.Ledger.reportState.type;
      window.Ledger.reportState.type = document.getElementById("rType").value;
      if(prevType !== window.Ledger.reportState.type){
        window.Ledger.reportState.category = "all";
        window.Ledger.reportState.subcategory = "all";
      }
      if(window.Ledger.reportState.datePreset !== "custom"){
        window.Ledger.renderPage();
      }
    });
  });
  ["rCategory","rSubcategory"].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.addEventListener("change", function(){
      if(id === "rCategory"){
        window.Ledger.reportState.category = document.getElementById("rCategory").value;
        window.Ledger.reportState.subcategory = "all";
      } else {
        window.Ledger.reportState.subcategory = document.getElementById("rSubcategory").value;
      }
      if(window.Ledger.reportState.datePreset !== "custom"){
        window.Ledger.renderPage();
      }
    });
  });
  var rClearBtn = document.getElementById("rClearFiltersBtn");
  if(rClearBtn) rClearBtn.addEventListener("click", function(){
    window.Ledger.reportState = { tab:window.Ledger.reportState.tab, datePreset:"month", dateFrom:"", dateTo:"", account:"all", currency:"all", category:"all", subcategory:"all", type:"all", search:"" };
    window.Ledger.renderPage();
  });
  var rSearch = document.getElementById("rSearch");
  if(rSearch) rSearch.addEventListener("input", function(){ window.Ledger.reportState.search = rSearch.value; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-rtab]"), function(b){
    b.addEventListener("click", function(){ window.Ledger.reportState.tab = b.getAttribute("data-rtab"); window.Ledger.renderPage(); });
  });
  var exportReportCsv = document.getElementById("exportReportCsv");
  if(exportReportCsv) exportReportCsv.addEventListener("click", function(){
    var f = window.Ledger.reportState;
    var typeMap = {expense:["expense","refund"], income:["income"], transfer:["transfer"], refund:["refund"]};
    var types = typeMap[f.tab] || ["expense","refund","income","transfer"];
    var list = window.Ledger.reportFilterTx(types);
    if(list.length === 0){ window.Ledger.showToast("No transactions to export"); return; }
    var rows = [["Date","Type","Description","Notes","Category","Subcategory","Account/From","To","Amount","Currency"]];
    list.slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).forEach(function(t){
      var cur = "USD", from="", to="";
      if(t.type === "transfer"){
        var fr = window.Ledger.entityRef(t.fromType,t.fromId), toR = window.Ledger.entityRef(t.toType,t.toId);
        from = fr?fr.name:""; to = toR?toR.name:""; cur = fr?fr.currency:"USD";
      } else if(t.linkId){
        var acc = window.Ledger.findAccount(t.account);
        from = acc?acc.name:""; cur = acc?acc.currency:"USD";
        var otherRow = window.Ledger.DB.transactions.find(function(x){ return x.linkId===t.linkId && x.id!==t.id; });
        var otherAcc = otherRow ? window.Ledger.findAccount(otherRow.account) : null;
        to = otherAcc ? otherAcc.name : "";
      } else {
        var acc2 = window.Ledger.findAccount(t.account);
        from = acc2?acc2.name:""; cur = acc2?acc2.currency:"USD";
      }
      rows.push([t.date, t.linkId ? "transfer (cross-currency)" : t.type, t.desc||"", t.notes||"", t.category?window.Ledger.categoryName(t.category):"", t.subcategory?window.Ledger.subcatName(t.category,t.subcategory):"", from, to, t.amount.toFixed(2), cur]);
    });
    var csv = rows.map(function(r){
      return r.map(function(cell){
        var s = String(cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(",");
    }).join("\n");
    var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "ledger-report-" + window.Ledger.todayISO() + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  var upcomingLink = document.querySelector(".upcoming-link");
  if(upcomingLink) upcomingLink.addEventListener("click", function(e){ e.preventDefault(); window.Ledger.navigateTo("scheduled"); });
};

})();
