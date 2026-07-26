(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireAccountsPage = function(){
  var el;
  el = document.getElementById("addAcctBtn"); if(el) el.addEventListener("click", function(){ window.Ledger.openAccountModal(null); });
  el = document.getElementById("addGroupBtn"); if(el) el.addEventListener("click", function(){ window.Ledger.openAddGroupModal(); });

  Array.prototype.forEach.call(document.querySelectorAll("[data-acct-click]"), function(card){
    card.addEventListener("click", function(e){
      if(e.target.closest(".kw")) return;
      var id = card.getAttribute("data-acct-click");
      window.Ledger.registerFilters = window.Ledger.registerFilters || {};
      window.Ledger.registerFilters.account = id;
      window.Ledger.navigateTo("transactions");
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-kebab-toggle]"), function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var id = btn.getAttribute("data-kebab-toggle");
      var menu = btn.parentElement.querySelector(".km");
      Array.prototype.forEach.call(document.querySelectorAll(".km.open"), function(m){ if(m !== menu) m.classList.remove("open"); });
      if(menu) menu.classList.toggle("open");
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-action]"), function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      var action = btn.getAttribute("data-action");
      var id = btn.getAttribute("data-id");
      var menu = btn.closest(".km");
      if(menu) menu.classList.remove("open");
      if(action === "edit"){
        window.Ledger.openAccountModal(window.Ledger.findAccount(id));
      } else if(action === "update-balance"){
        window.Ledger.openUpdateBalanceModal(id);
      } else if(action === "reconcile"){
        var acct = window.Ledger.findAccount(id);
        if(acct) window.Ledger.openReconModal(acct);
      } else if(action === "archive"){
        var a = window.Ledger.findAccount(id);
        window.Ledger.openConfirmModal("Archive account?", "Archive \"" + (a?a.name:"") + "\"? It will be hidden from active lists but all transactions stay intact.", function(){
          window.Ledger.archiveAccount(id);
        });
      } else if(action === "delete"){
        window.Ledger.openDeleteAccountModal(id);
      }
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll("[data-edit-group]"), function(el){
    el.addEventListener("click", function(e){
      e.stopPropagation();
      window.Ledger.openEditGroupModal(el.getAttribute("data-edit-group"));
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-group]"), function(el){
    el.addEventListener("click", function(e){
      e.stopPropagation();
      var gid = el.getAttribute("data-del-group");
      var g = (window.Ledger.DB.groups||[]).find(function(g){ return g.id === gid; });
      window.Ledger.openConfirmModal("Delete group?", "Delete \"" + (g?g.name:"") + "\"? Accounts in this group will become ungrouped.", function(){
        window.Ledger.deleteGroup(gid);
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

  if(!window.Ledger._acctKebabListenerAdded){
    document.addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".km.open"), function(m){ m.classList.remove("open"); });
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape"){
        Array.prototype.forEach.call(document.querySelectorAll(".km.open"), function(m){ m.classList.remove("open"); });
      }
    });
    window.Ledger._acctKebabListenerAdded = true;
  }
};

})();
