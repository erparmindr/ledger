window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderCategoriesPage = function(){
  var DB = window.Ledger.DB;
  var activeTab = window.Ledger._catTab || "expense";

  var expCount = DB.categories.filter(function(c){ return c.type==="expense"; }).length;
  var incCount = DB.categories.filter(function(c){ return c.type==="income"; }).length;
  var trfCount = DB.categories.filter(function(c){ return c.type==="transfer"; }).length;

  var tabIcons = { expense:"\u2212", income:"+", transfer:"\u21c4" };

  function renderCatRow(c){
    var subCount = c.subs ? c.subs.length : 0;
    var hasSubs = subCount > 0;

    var rows = '';
    rows += '<div class="cat-row cat-row-parent" data-cat-id="' + c.id + '">'
      + '<div class="cat-row-main">'
      + '  <span class="cat-row-chevron">' + (hasSubs ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' : '<span class="cat-row-spacer"></span>') + '</span>'
      + '  <span class="cat-row-name">' + window.Ledger.escapeHtml(c.name) + '</span>'
      + '  <span class="cat-row-count">' + (subCount > 0 ? subCount + ' sub' + (subCount !== 1 ? 's' : '') : '') + '</span>'
      + '  <span class="cat-row-actions">'
      + '    <button class="icon-btn sm" data-add-sub="' + c.id + '" title="Add subcategory" aria-label="Add subcategory"><i data-lucide="plus"></i></button>'
      + '    <button class="icon-btn sm" data-rename-cat="' + c.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil"></i></button>'
      + '    <button class="icon-btn sm danger" data-del-cat="' + c.id + '" title="Delete" aria-label="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
      + '  </span>'
      + '</div>'
      + '</div>';

    if(hasSubs){
      c.subs.forEach(function(s){
        rows += '<div class="cat-row cat-row-sub" data-sub-id="' + s.id + '" data-parent-id="' + c.id + '">'
          + '<div class="cat-row-main">'
          + '  <span class="cat-row-indent"></span>'
          + '  <span class="cat-row-sub-dot"></span>'
          + '  <span class="cat-row-name">' + window.Ledger.escapeHtml(s.name) + '</span>'
          + '  <span class="cat-row-actions">'
          + '    <button class="icon-btn sm" data-rename-sub="' + c.id + '|' + s.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil"></i></button>'
          + '    <button class="icon-btn sm danger" data-del-sub="' + c.id + '|' + s.id + '" title="Delete" aria-label="Delete"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
          + '  </span>'
          + '</div>'
          + '</div>';
      });
    }

    return rows;
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

    return addHtml + '<div class="cat-list">' + cats.map(renderCatRow).join("") + '</div>';
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
