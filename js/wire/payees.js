(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wirePayeesPage = function(){
  var addPersonEl = document.getElementById("addPersonBtn");
  if(addPersonEl) addPersonEl.addEventListener("click", function(){ window.Ledger.openPersonModal(null); });
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
};

})();
