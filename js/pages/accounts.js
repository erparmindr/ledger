window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderAccountsPage = function(){
  var DB = window.Ledger.DB;
  var ACCOUNT_TYPES = window.Ledger.ACCOUNT_TYPES;
  var accountBalance = window.Ledger.accountBalance;
  var fmtMoney = window.Ledger.fmtMoney;
  var escapeHtml = window.Ledger.escapeHtml;

  function renderCard(a, archived){
    var bal = accountBalance(a.id);
    var isCredit = a.type === "credit_card";
    var typeLabel = ACCOUNT_TYPES.find(function(t){ return t.id===a.type; }).label;
    var ops = archived
      ? '<button class="icon-btn" data-unarchive-acct="' + a.id + '" title="Unarchive" aria-label="Unarchive"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>'
      : '<button class="icon-btn" data-edit-acct="' + a.id + '" title="Edit" aria-label="Edit"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
      + '<button class="icon-btn" data-archive-acct="' + a.id + '" title="Archive" aria-label="Archive"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>';
    return '<div class="acct-card' + (isCredit?' kind-credit':'') + (archived?' archived':'') + '">'
      + '<div class="acct-card-left">'
      + '  <div class="nm">' + escapeHtml(a.name) + (archived?' <span class="faint">(archived)</span>':'') + '</div>'
      + '  <div class="acct-type-label">' + typeLabel + ' &middot; ' + a.currency + '</div>'
      + '  <div class="bal num ' + (isCredit && bal<0 ? 'neg' : '') + '">' + fmtMoney(bal, a.currency) + '</div>'
      + '</div>'
      + '<div class="acct-card-right">' + ops + '</div>'
      + '</div>';
  }

  var active = DB.accounts.filter(function(a){ return !a.archived; });
  var archived = DB.accounts.filter(function(a){ return a.archived; });

  var activeCards = active.length
    ? active.map(function(a){ return renderCard(a, false); }).join("")
    : '<div class="empty-state"><div class="big">No accounts yet</div>Add your first account to get started.</div>';

  var archivedSection = archived.length
    ? '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 14px; color:var(--text-faint);">Archived</h2>'
    + '  <div style="display:flex; flex-direction:column; gap:10px;">' + archived.map(function(a){ return renderCard(a, true); }).join("") + '</div>'
    + '</div>'
    : '';

  return ''
    + '<div class="card card-pad">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
    + '    <h2 style="font-size:16px; font-weight:800; margin:0;">Accounts</h2>'
    + '    <button class="btn btn-primary btn-sm" id="addAcctBtn">+ Add account</button>'
    + '  </div>'
    + '  <div style="display:flex; flex-direction:column; gap:10px;">' + activeCards + '</div>'
    + '</div>'
    + archivedSection;
};
