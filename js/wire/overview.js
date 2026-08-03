(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireOverviewPage = function(){
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
  var reconToggle = document.getElementById("reconToggle");
  if(reconToggle) reconToggle.addEventListener("click", function(){
    var details = document.getElementById("reconDetails");
    if(details) details.style.display = details.style.display === "none" ? "block" : "none";
  });
  var reconDismiss = document.getElementById("reconDismiss");
  if(reconDismiss) reconDismiss.addEventListener("click", function(){
    var banner = document.getElementById("reconBanner");
    if(banner) banner.style.display = "none";
  });
  var dismissBackupWarning = document.getElementById("dismissBackupWarning");
  if(dismissBackupWarning) dismissBackupWarning.addEventListener("click", function(){
    try{ localStorage.setItem("ledger_backup_warning_dismissed", "1"); }catch(e){}
    var banner = document.getElementById("backupWarningBanner");
    if(banner) banner.style.display = "none";
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-recon-acct]"), function(btn){
    btn.addEventListener("click", function(){
      var acctId = btn.getAttribute("data-recon-acct");
      var acct = window.Ledger.findAccount(acctId);
      if(acct) window.Ledger.openReconModal(acct);
    });
  });
  window.Ledger.wireTxRowActions();
};

})();
