(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireSettingsPage = function(){
  var el;

  /* ---- Layout mode toggle ---- */
  Array.prototype.forEach.call(document.querySelectorAll(".layout-mode-btn"), function(btn){
    btn.addEventListener("click", function(){
      window.Ledger.applyLayoutMode(btn.getAttribute("data-layout-mode"));
    });
  });

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
  el = document.getElementById("loadDemoDataBtn"); if(el) el.addEventListener("click", function(){
    window.Ledger.openConfirmModal(
      "Load demo data?",
      "This will replace all current accounts, transactions, people and categories with about a year of realistic sample data. Export a backup first if you want to keep anything. This can't be undone.",
      function(){
        window.Ledger.loadDemoData();
      }
    );
  });
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

  if(window.Ledger.refreshDemoStatus) window.Ledger.refreshDemoStatus();
};

})();
