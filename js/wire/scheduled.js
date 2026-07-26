(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireScheduledPage = function(){
  function schedCatOptions(type){
    var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === type; });
    if(!relevant.length) return '<option value="">No category</option>';
    return '<option value="">No category</option>' + relevant.map(function(c){
      return '<option value="'+c.id+'">'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }
  function refreshSchedSubcat(){
    var catId = document.getElementById("rCategory").value;
    var field = document.getElementById("rSubcatField");
    var sel = document.getElementById("rSubcategory");
    if(!field || !sel) return;
    if(catId && window.Ledger.categoryHasSubs(catId)){
      var cat = window.Ledger.findCategory(catId);
      sel.innerHTML = cat.subs.map(function(s){
        return '<option value="'+s.id+'">'+window.Ledger.escapeHtml(s.name)+'</option>';
      }).join("");
      field.style.display = "flex";
    } else {
      field.style.display = "none";
      sel.innerHTML = "";
    }
    window.Ledger.refreshCustomDropdown(sel);
  }
  var rTypeEl = document.getElementById("rType");
  if(rTypeEl) rTypeEl.addEventListener("change", function(){
    var catSel = document.getElementById("rCategory");
    catSel.innerHTML = schedCatOptions(rTypeEl.value);
    window.Ledger.refreshCustomDropdown(catSel);
    refreshSchedSubcat();
  });
  var rCatEl = document.getElementById("rCategory");
  if(rCatEl) rCatEl.addEventListener("change", refreshSchedSubcat);
  refreshSchedSubcat();

  var addRecurringEl = document.getElementById("addRecurringBtn");
  if(addRecurringEl) addRecurringEl.addEventListener("click", function(){
    var name = document.getElementById("rName").value.trim();
    var amount = parseFloat(document.getElementById("rAmount").value);
    var frequency = document.getElementById("rFrequency").value;
    var startDate = document.getElementById("rStartDate").value;
    var type = document.getElementById("rType").value;
    var account = document.getElementById("rAccount").value;
    var category = document.getElementById("rCategory").value;
    var subcategory = document.getElementById("rSubcategory").value;
    var postModeEl = document.querySelector('input[name="rPostMode"]:checked');
    var postMode = postModeEl ? postModeEl.value : "auto";
    if(!name || isNaN(amount) || amount<=0 || !startDate || !account){ window.Ledger.showToast("Fill in all fields"); return; }
    window.Ledger.addRecurring({ id:window.Ledger.uid(), name:name, amount:amount, frequency:frequency, startDate:startDate, type:type, account:account, category:category, subcategory:subcategory, postMode:postMode });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-confirm-recurring]"), function(b){
    b.addEventListener("click", function(){
      var id = b.getAttribute("data-confirm-recurring");
      var r = window.Ledger.DB.recurring.find(function(x){ return x.id===id; });
      if(!r) return;
      var acc = window.Ledger.findAccount(r.account);
      window.Ledger.addTransaction({
        id:window.Ledger.uid(), type:r.type, date:window.Ledger.todayISO(), amount:r.amount, desc:r.name,
        notes:"Posted from recurring item", account:r.account, category:r.category||"", subcategory:r.subcategory||"", created:Date.now()
      });
      window.Ledger._advanceRecurring(r);
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
};

})();
