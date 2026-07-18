window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderCategoriesPage = function(){
  var DB = window.Ledger.DB;
  var activeTab = window.Ledger._catTab || "expense";

  // Count transactions per category
  var txCounts = {};
  var subCounts = {};
  DB.transactions.forEach(function(t){
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){ txCounts[s.categoryId] = (txCounts[s.categoryId]||0) + 1; });
    } else if(t.category){
      txCounts[t.category] = (txCounts[t.category]||0) + 1;
      if(t.subcategory){
        var subKey = t.category + "|" + t.subcategory;
        subCounts[subKey] = (subCounts[subKey]||0) + 1;
      }
    }
  });

  // Count tabs
  var expCount = DB.categories.filter(function(c){ return c.type==="expense"; }).length;
  var incCount = DB.categories.filter(function(c){ return c.type==="income"; }).length;
  var trfCount = DB.categories.filter(function(c){ return c.type==="transfer"; }).length;

  function renderCatItem(c){
    var count = txCounts[c.id] || 0;
    var subCount = c.subs ? c.subs.length : 0;
    var subsHtml = (c.subs || []).map(function(s){
      var subCount = subCounts[c.id + "|" + s.id] || 0;
      return '<div class="subcat-row">'
        + '<span>' + window.Ledger.escapeHtml(s.name) + (subCount > 0 ? ' <span class="faint" style="font-size:10px;">(' + subCount + ')</span>' : '') + '</span>'
        + '<span>'
        + '  <button class="icon-btn" data-rename-sub="' + c.id + '|' + s.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>'
        + '  <button class="icon-btn danger" data-del-sub="' + c.id + '|' + s.id + '" title="Delete" aria-label="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
        + '</span>'
        + '</div>';
    }).join("");

    return '<div class="category-row" style="flex-direction:column; align-items:stretch; padding:12px 0;">'
      + '<div style="display:flex; justify-content:space-between; align-items:center;">'
      + '  <div style="display:flex; align-items:center; gap:10px;">'
      + '    <span style="font-weight:700; font-size:14px;">' + window.Ledger.escapeHtml(c.name) + '</span>'
      + '    <span style="font-size:11px; color:var(--text-faint); background:var(--surface-2); padding:2px 8px; border-radius:var(--radius-pill);">' + count + ' tx' + (count !== 1 ? 's' : '') + '</span>'
      + (subCount > 0 ? '    <span style="font-size:11px; color:var(--text-faint);">' + subCount + ' sub' + (subCount !== 1 ? 's' : '') + '</span>' : '')
      + '  </div>'
      + '  <span style="display:flex; align-items:center; gap:2px;">'
      + '    <button class="icon-btn" data-add-sub="' + c.id + '" title="Add subcategory" aria-label="Add subcategory"><i data-lucide="plus" style="width:14px;height:14px;"></i></button>'
      + '    <button class="icon-btn" data-rename-cat="' + c.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>'
      + '    <button class="icon-btn danger" data-del-cat="' + c.id + '" title="Delete" aria-label="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
      + '  </span>'
      + '</div>'
      + (subsHtml ? '<div class="subcat-list">' + subsHtml + '</div>' : '')
      + '</div>';
  }

  function renderTabContent(type){
    var cats = DB.categories.filter(function(c){ return c.type === type; });
    var placeholder = type === "transfer" ? "New transfer category" : "New " + type + " category";
    var emptyMsg = type === "transfer" ? "No transfer categories yet." : "No " + type + " categories yet.";

    var addHtml = '<div class="inline-add" style="margin-bottom:12px; margin-top:0;">'
      + '<input type="text" id="newCatName' + type.charAt(0).toUpperCase() + type.slice(1) + '" placeholder="' + placeholder + '">'
      + '<button class="btn btn-sm" id="addCatBtn' + type.charAt(0).toUpperCase() + type.slice(1) + '">Add</button>'
      + '</div>';

    if(cats.length === 0){
      return addHtml
        + '<div style="text-align:center; padding:32px 0;">'
        + '<div style="font-size:28px; margin-bottom:8px; opacity:0.4;">' + (type === "expense" ? "🏷️" : type === "income" ? "💰" : "🔄") + '</div>'
        + '<div class="faint" style="font-size:13px;">' + emptyMsg + '</div>'
        + '<div class="faint" style="font-size:12px; margin-top:4px;">Add your first category above.</div>'
        + '</div>';
    }

    return addHtml + '<div>' + cats.map(renderCatItem).join("") + '</div>';
  }

  function tabBtn(id, label, count, isActive){
    return '<button class="type-pill' + (isActive ? ' active' : '') + '" data-cat-tab="' + id + '" style="flex:1;">'
      + label + ' <span style="font-size:11px; opacity:0.7;">(' + count + ')</span>'
      + '</button>';
  }

  return ''
    + '<div class="card card-pad">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
    + '    <h2 style="font-size:16px; font-weight:800; margin:0;">Categories</h2>'
    + '  </div>'
    + '  <div class="type-pills" style="margin-bottom:16px;">'
    + tabBtn("expense", "Expense", expCount, activeTab === "expense")
    + tabBtn("income", "Income", incCount, activeTab === "income")
    + tabBtn("transfer", "Transfer", trfCount, activeTab === "transfer")
    + '  </div>'
    + '  <div id="catTabContent">'
    + renderTabContent(activeTab)
    + '  </div>'
    + '</div>';
};
