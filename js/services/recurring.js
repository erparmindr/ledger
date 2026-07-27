(function(){
window.Ledger = window.Ledger || {};

window.Ledger._advanceRecurring = function(r){
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
};

window.Ledger.autoPostRecurring = function(){
  var today = window.Ledger.todayISO();
  var posted = [];
  window.Ledger.DB.recurring.forEach(function(r){
    if(r.postMode !== "auto") return;
    var safety = 0;
    while(safety < 100){
      var due = window.Ledger.nextDueDate(r, today);
      if(due > today) break;
      var acc = window.Ledger.findAccount(r.account);
      window.Ledger.DB.transactions.push({
        id:window.Ledger.uid(), type:r.type, date:due, amount:r.amount, desc:r.name,
        notes:"Auto-posted from recurring item", account:r.account, category:r.category||"", subcategory:r.subcategory||"", created:Date.now()
      });
      window.Ledger._advanceRecurring(r);
      window.Ledger.saveData();
      safety++;
    }
    if(safety > 0) posted.push(r.name + " (" + safety + "x) \u2192 " + (acc?acc.name:"account"));
  });
  if(posted.length > 0){
    window.Ledger.showToast("Auto-posted: " + posted.join(", "));
  }
};

})();
