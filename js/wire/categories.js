(function(){
window.Ledger = window.Ledger || {};

window.Ledger.wireCategoriesPage = function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-cat-tab]"), function(btn){
    btn.addEventListener("click", function(){
      window.Ledger._catTab = btn.getAttribute("data-cat-tab");
      window.Ledger.renderPage();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".cat-row-parent"), function(row){
    var chevron = row.querySelector(".cat-row-chevron");
    if(!chevron) return;
    chevron.addEventListener("click", function(e){
      e.stopPropagation();
      var catId = row.getAttribute("data-cat-id");
      row.classList.toggle("collapsed");
      var subs = document.querySelectorAll('.cat-row-sub[data-parent-id="' + catId + '"]');
      Array.prototype.forEach.call(subs, function(s){
        s.style.display = row.classList.contains("collapsed") ? "none" : "";
      });
    });
  });
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
  Array.prototype.forEach.call(document.querySelectorAll("[data-add-sub]"), function(b){
    b.addEventListener("click", function(){
      var catId = b.getAttribute("data-add-sub");
        window.Ledger.openTextPromptModal("Add subcategory", "Subcategory name", "", function(name){
          window.Ledger.addSubcategory(catId, name);
        });
    });
  });
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
  Array.prototype.forEach.call(document.querySelectorAll("[data-del-cat]"), function(b){
    b.addEventListener("click", function(){
      var catId = b.getAttribute("data-del-cat");
      var cat = window.Ledger.DB.categories.find(function(c){ return c.id===catId; });
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
};

})();
