window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderCategoriesPage = function(){
  function renderCatGroup(forType){
    var cats = window.Ledger.DB.categories.filter(function(c){ return c.type === forType; });
    if(cats.length === 0){
      return '<div class="faint" style="font-size:12.5px; padding:8px 0;">No categories yet.</div>';
    }
    return cats.map(function(c){
      var subsHtml = c.subs.map(function(s){
        return '<div class="subcat-row"><span>' + window.Ledger.escapeHtml(s.name) + '</span>'
          + '<span><button class="icon-btn" data-rename-sub="' + c.id + '|' + s.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
          + '<button class="icon-btn danger" data-del-sub="' + c.id + '|' + s.id + '" title="Delete" aria-label="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></span></div>';
      }).join("");
      return '<div class="category-row" style="flex-direction:column; align-items:stretch;">'
        + '<div style="display:flex; justify-content:space-between; align-items:center;">'
        + '  <span style="font-weight:700;">' + window.Ledger.escapeHtml(c.name) + '</span>'
        + '  <span>'
        + '    <button class="icon-btn" data-add-sub="' + c.id + '" title="Add subcategory" aria-label="Add subcategory">+ sub</button>'
        + '    <button class="icon-btn" data-rename-cat="' + c.id + '" title="Rename" aria-label="Rename"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
        + '    <button class="icon-btn danger" data-del-cat="' + c.id + '" title="Delete" aria-label="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
        + '  </span>'
        + '</div>'
        + (subsHtml ? '<div class="subcat-list">' + subsHtml + '</div>' : '')
        + '</div>';
    }).join("");
  }

  return ''
    + '<div class="card card-pad">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Expense categories</h2>'
    + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shown when logging an expense.</p>'
    + '  <div>' + renderCatGroup("expense") + '</div>'
    + '  <div class="inline-add"><input type="text" id="newCatNameExpense" placeholder="New expense category"><button class="btn btn-sm" id="addCatBtnExpense">Add</button></div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Income categories</h2>'
    + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shown when logging income.</p>'
    + '  <div>' + renderCatGroup("income") + '</div>'
    + '  <div class="inline-add"><input type="text" id="newCatNameIncome" placeholder="New income category"><button class="btn btn-sm" id="addCatBtnIncome">Add</button></div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Transfer categories</h2>'
    + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shown when logging a transfer. No subcategories needed.</p>'
    + '  <div>' + renderCatGroup("transfer") + '</div>'
    + '  <div class="inline-add"><input type="text" id="newCatNameTransfer" placeholder="New transfer category"><button class="btn btn-sm" id="addCatBtnTransfer">Add</button></div>'
    + '</div>';
};
