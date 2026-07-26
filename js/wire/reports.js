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
  if(exportReportCsv) exportReportCsv.addEventListener("click", window.Ledger.exportCsv);

  var upcomingLink = document.querySelector(".upcoming-link");
  if(upcomingLink) upcomingLink.addEventListener("click", function(e){ e.preventDefault(); window.Ledger.navigateTo("scheduled"); });
};

})();
