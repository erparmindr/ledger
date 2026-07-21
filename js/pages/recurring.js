window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger._recurringCatOptions = function(type){
  var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === type; });
  if(!relevant.length) return '<option value="">No category</option>';
  return '<option value="">No category</option>' + relevant.map(function(c){
    return '<option value="'+c.id+'">'+window.Ledger.escapeHtml(c.name)+'</option>';
  }).join("");
};

window.Ledger.pages.renderRecurringPage = function(){
  var today = window.Ledger.todayISO();
  var rows = window.Ledger.DB.recurring.slice().sort(function(a,b){ return window.Ledger.nextDueDate(a,today).localeCompare(window.Ledger.nextDueDate(b,today)); }).map(function(r){
    var acc = window.Ledger.findAccount(r.account);
    var due = window.Ledger.nextDueDate(r, today);
    var diffDays = Math.round((new Date(due+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
    var dueDisp = new Date(due+"T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric"});
    var label;
    if(diffDays === 0) label = "Due today";
    else if(diffDays > 0) label = "Due in " + diffDays + " day" + (diffDays===1?"":"s") + " (" + dueDisp + ")";
    else label = "Overdue &mdash; was due " + dueDisp;
    var soon = diffDays <= 3;
    var canPost = diffDays <= 0;
    var isAuto = r.postMode === "auto";
    var catName = r.category ? window.Ledger.categoryName(r.category) : "";
    var modeBadge = isAuto
      ? '<span class="faint" style="font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.04em; opacity:.6;">auto</span>'
      : '';
    return '<div class="bill-row">'
      + '<div>'
      + '  <div class="nm">' + window.Ledger.escapeHtml(r.name) + ' <span class="faint" style="font-weight:400;">&middot; ' + (r.type==="income"?"income":"expense") + ' &middot; ' + window.Ledger.frequencyLabel(r.frequency) + (catName ? ' &middot; ' + window.Ledger.escapeHtml(catName) : '') + ' ' + modeBadge + '</span></div>'
      + '  <div class="due ' + (soon?'soon':'') + '">' + label + ' &middot; ' + window.Ledger.escapeHtml(acc?acc.name:"?") + '</div>'
      + '</div>'
      + '<div style="display:flex; align-items:center; gap:10px;">'
      + '  <div class="num" style="font-size:14px;">' + window.Ledger.fmtMoney(r.amount, acc?acc.currency:"USD") + '</div>'
      + (canPost && !isAuto ? '<button class="btn btn-sm btn-primary" data-confirm-recurring="' + r.id + '">Confirm &amp; post</button>' : '')
      + '  <button class="icon-btn danger" data-del-recurring="' + r.id + '" title="Remove" aria-label="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
      + '</div>'
      + '</div>';
  }).join("");

  if(window.Ledger.DB.recurring.length === 0){
    rows = '<div class="empty-state"><div class="big">No recurring transactions</div>Add subscriptions or fixed bills below to get due-date prompts.</div>';
  }

  var accOpts = window.Ledger.DB.accounts.filter(function(a){ return !a.archived; }).map(function(a){ return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+'</option>'; }).join("");
  var defaultType = "expense";
  var catOpts = window.Ledger._recurringCatOptions(defaultType);

  return ''
    + '<div class="card">'
    + '  <div class="card-header"><h2>Recurring transactions</h2><span class="hint">confirm-to-post or auto-post when due</span></div>'
    + '  <div class="card-pad" style="padding-top:14px; padding-bottom:6px;">' + rows + '</div>'
    + '  <div class="card-pad">'
    + '    <div class="form-row cols-3">'
    + '      <div class="field"><label>Name</label><input type="text" id="rName" placeholder="e.g. Netflix"></div>'
    + '      <div class="field"><label>Amount</label><input type="number" id="rAmount" step="0.01" min="0.01" placeholder="0.00"></div>'
    + '      <div class="field"><label>Frequency</label><select id="rFrequency"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="biweekly">Every 2 weeks</option></select></div>'
    + '    </div>'
    + '    <div class="form-row cols-3" style="margin-top:12px;">'
    + '      <div class="field"><label>Start date</label><input type="date" id="rStartDate" value="' + window.Ledger.todayISO() + '"></div>'
    + '    </div>'
    + '    <div class="form-row" style="margin-top:12px;">'
    + '      <div class="field"><label>Type</label><select id="rType"><option value="expense">Expense</option><option value="income">Income</option></select></div>'
    + '      <div class="field"><label>Account</label><select id="rAccount">' + accOpts + '</select></div>'
    + '      <div class="field"><label>Category</label><select id="rCategory">' + catOpts + '</select></div>'
    + '    </div>'
    + '    <div class="form-row" style="margin-top:12px;">'
    + '      <div class="field" id="rSubcatField" style="display:none;"><label>Subcategory <span class="faint">(optional)</span></label><select id="rSubcategory"></select></div>'
    + '    </div>'
    + '    <div class="form-row" style="margin-top:12px; align-items:center;">'
    + '      <div class="field" style="flex:none;"><label>Post mode</label></div>'
    + '      <div style="display:flex; gap:16px; align-items:center; padding-top:4px;">'
    + '        <label style="display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--text);"><input type="radio" name="rPostMode" value="auto" checked> Auto-post when due</label>'
    + '        <label style="display:flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--text);"><input type="radio" name="rPostMode" value="review"> Review before posting</label>'
    + '      </div>'
    + '    </div>'
    + '    <button class="btn btn-primary" id="addRecurringBtn" style="margin-top:14px;">Add recurring item</button>'
    + '  </div>'
    + '</div>';
};
