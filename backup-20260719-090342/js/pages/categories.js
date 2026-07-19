window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderCategoriesPage = function(){
  var DB = window.Ledger.DB;
  var activeTab = window.Ledger._catTab || "expense";

  var expCount = DB.categories.filter(function(c){ return c.type==="expense"; }).length;
  var incCount = DB.categories.filter(function(c){ return c.type==="income"; }).length;
  var trfCount = DB.categories.filter(function(c){ return c.type==="transfer"; }).length;

  var tabIcons = { expense:"\u2212", income:"+", transfer:"\u21c4" };

  function renderCatCard(c){
    var subCount = c.subs ? c.subs.length : 0;
    var hasSubs = subCount > 0;

    var subsHtml = "";
    if(hasSubs){
      subsHtml = '<div class="cat-card-subs">'
        + '<div class="cat-card-sub-head">'
        + '<span class="cat-card-sub-title">Subcategories</span>'
        + '<span class="cat-card-chevron"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>'
        + '</div>'
        + '<div class="cat-card-sub-list">'
        + c.subs.map(function(s){
          return '<div class="cat-card-sub">'
            + '<span class="cat-card-sub-name">' + window.Ledger.escapeHtml(s.name) + '</span>'
            + '<span class="cat-card-sub-actions">'
            + '<button class="icon-btn sm" data-rename-sub="' + c.id + '|' + s.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil"></i></button>'
            + '<button class="icon-btn sm danger" data-del-sub="' + c.id + '|' + s.id + '" title="Delete" aria-label="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
            + '</span></div>';
        }).join("")
        + '</div>';
    }

    return '<div class="cat-card">'
      + '<div class="cat-card-head">'
      + '  <div class="cat-card-info">'
      + '    <span class="cat-card-name">' + window.Ledger.escapeHtml(c.name) + '</span>'
      + '  </div>'
      + '  <div class="cat-card-actions">'
      + '    <button class="icon-btn sm" data-add-sub="' + c.id + '" title="Add subcategory" aria-label="Add subcategory"><i data-lucide="plus"></i></button>'
      + '    <button class="icon-btn sm" data-rename-cat="' + c.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil"></i></button>'
      + '    <button class="icon-btn sm danger" data-del-cat="' + c.id + '" title="Delete" aria-label="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
      + '  </div>'
      + '</div>'
      + subsHtml
      + '</div>';
  }

  function renderTabContent(type){
    var cats = DB.categories.filter(function(c){ return c.type === type; });
    var placeholder = type === "transfer" ? "New transfer category" : "New " + type + " category";
    var emptyMsg = type === "transfer" ? "No transfer categories yet." : "No " + type + " categories yet.";

    var addHtml = '<div class="cat-add-row">'
      + '<input type="text" id="newCatName' + type.charAt(0).toUpperCase() + type.slice(1) + '" placeholder="' + placeholder + '" class="cat-add-input">'
      + '<button class="btn btn-primary btn-sm" id="addCatBtn' + type.charAt(0).toUpperCase() + type.slice(1) + '">Add</button>'
      + '</div>';

    if(cats.length === 0){
      return addHtml
        + '<div class="cat-empty">'
        + '<div class="cat-empty-icon">' + (type === "expense" ? "\ud83c\udff7\ufe0f" : type === "income" ? "\ud83d\udcb0" : "\ud83d\udd04") + '</div>'
        + '<div class="cat-empty-msg">' + emptyMsg + '</div>'
        + '<div class="cat-empty-hint">Add your first category above.</div>'
        + '</div>';
    }

    return addHtml + '<div class="cat-card-grid">' + cats.map(renderCatCard).join("") + '</div>';
  }

  function tabBtn(id, label, count, isActive){
    return '<button class="type-pill' + (isActive ? ' active' : '') + '" data-cat-tab="' + id + '">'
      + tabIcons[id] + ' ' + label + ' <span class="tab-count">' + count + '</span>'
      + '</button>';
  }

  return ''
    + '<div class="card card-pad">'
    + '  <div class="cat-page-head">'
    + '    <h2 class="cat-page-title">Categories</h2>'
    + '  </div>'
    + '  <div class="type-pills cat-tabs">'
    + tabBtn("expense", "Expense", expCount, activeTab === "expense")
    + tabBtn("income", "Income", incCount, activeTab === "income")
    + tabBtn("transfer", "Transfer", trfCount, activeTab === "transfer")
    + '  </div>'
    + '  <div id="catTabContent" class="cat-tab-content">'
    + renderTabContent(activeTab)
    + '  </div>'
    + '</div>';
};
