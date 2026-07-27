(function(){
window.Ledger = window.Ledger || {};

/* ---------- Account modal ---------- */
window.Ledger.openAccountModal = function(existing){
  var isEdit = !!existing;
  var a = existing ? Object.assign({}, existing) : { name:"", type:"checking", currency:"USD", owner:"", openingBalance:0, archived:false };
  var typeOpts = window.Ledger.ACCOUNT_TYPES.map(function(t){ return '<option value="'+t.id+'" '+(a.type===t.id?'selected':'')+'>'+t.label+'</option>'; }).join("");
  var curSuggestions = window.Ledger.CURRENCIES.map(function(c){ return '<option value="'+c+'">'+c+'</option>'; }).join("");
  var OWNERS = (window.Ledger.DB.groups || []).map(function(g){ return { id: g.id, label: g.name }; });
  var ownerOpts = '<option value="">None</option>' + OWNERS.map(function(o){ return '<option value="'+o.id+'" '+(a.owner===o.id?'selected':'')+'>'+window.Ledger.escapeHtml(o.label)+'</option>'; }).join("");
  var curBal = isEdit ? window.Ledger.accountBalance(a.id) : 0;

  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit account':'Add account') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="field"><label>Name</label><input type="text" id="acName" value="' + window.Ledger.escapeHtml(a.name) + '" placeholder="e.g. Checking"></div>'
    + '  <div class="form-row">'
    + '    <div class="field"><label>Type</label><select id="acType">' + typeOpts + '</select></div>'
    + '    <div class="field"><label>Currency</label><input type="text" id="acCurrency" list="acCurrencyList" value="' + window.Ledger.escapeHtml(a.currency) + '" placeholder="e.g. USD" style="text-transform:uppercase;" maxlength="10"><datalist id="acCurrencyList">' + curSuggestions + '</datalist></div>'
    + '  </div>'
    + '  <div class="field"><label>Owner</label><select id="acOwner">' + ownerOpts + '</select></div>'
    + (isEdit ? '  <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius); padding:12px 14px; display:flex; align-items:center; justify-content:space-between;">'
      + '    <div><div style="font-size:11px; font-weight:700; color:var(--text-faint); text-transform:uppercase; letter-spacing:0.05em;">Current balance</div>'
      + '    <div style="font-size:18px; font-weight:800; margin-top:2px; font-family:var(--font-num); font-variant-numeric:tabular-nums;">' + window.Ledger.fmtMoney(curBal, a.currency) + '</div></div>'
      + '  </div>'
      + '  <div class="field"><label>Set balance <span class="faint">(type new balance to correct)</span></label><input type="number" id="acSetBalance" step="0.01" placeholder="' + window.Ledger.fmtMoney(curBal, a.currency) + '"></div>'
    : '')
    + '  <div class="field"><label>Opening balance' + (a.type==='credit_card' ? ' <span class="faint">(negative if you owe)</span>' : '') + '</label><input type="number" id="acOpening" step="0.01" value="' + (a.openingBalance||0) + '"></div>'
    + (isEdit ? '  <label style="display:flex; align-items:center; gap:8px; font-size:13px;"><input type="checkbox" id="acArchived" ' + (a.archived?'checked':'') + '> Archived (hide from active lists)</label>' : '')
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveAcctBtn">' + (isEdit?'Save changes':'Add account') + '</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("saveAcctBtn").addEventListener("click", function(){
      var name = document.getElementById("acName").value.trim();
      if(!name){ window.Ledger.showToast("Enter an account name"); return; }
      var ob = parseFloat(document.getElementById("acOpening").value) || 0;
      var reb = isEdit ? a.reconciledBalance : null;
      var rea = isEdit ? a.reconciledAt : null;
      if(isEdit){
        var setBal = document.getElementById("acSetBalance").value;
        if(setBal !== "" && !isNaN(parseFloat(setBal))){
          var txSum = curBal - a.openingBalance;
          ob = parseFloat(setBal) - txSum;
          reb = parseFloat(setBal);
          rea = Date.now();
        }
      }
      var rec = {
        id: isEdit ? a.id : window.Ledger.uid(),
        name:name,
        type: document.getElementById("acType").value,
        currency: (document.getElementById("acCurrency").value || "USD").trim().toUpperCase(),
        owner: document.getElementById("acOwner").value,
        openingBalance: ob,
        archived: isEdit ? document.getElementById("acArchived").checked : false,
        reconciledBalance: reb,
        reconciledAt: rea,
        created: isEdit ? a.created : Date.now()
      };
      if(isEdit){
        window.Ledger.updateAccount(rec);
      } else {
        window.Ledger.addAccount(rec);
      }
      window.Ledger.closeModal();
      window.Ledger.showToast(isEdit ? "Account updated" : "Account added");
    });
  });
};

/* ---------- Reconciliation modal ---------- */
window.Ledger.openReconModal = function(account){
  var a = account;
  var bal = window.Ledger.accountBalance(a.id);
  var bk = window.Ledger.accountBreakdown(a.id);
  var dupes = window.Ledger.findDuplicates(a.id);
  var orphans = window.Ledger.findOrphanTransfers(a.id);
  var hasIssues = dupes.length > 0 || orphans.length > 0;

  function breakdownRow(label, val, color){
    return '<div class="recon-row"><span class="recon-row-label">' + label + '</span><span class="recon-row-val num">' + (val >= 0 ? '+' : '') + window.Ledger.fmtMoney(val, a.currency) + '</span></div>';
  }

  var breakdownHtml = ''
    + '<div class="recon-breakdown">'
    + breakdownRow('Opening balance', bk.opening)
    + breakdownRow('Income', bk.income)
    + breakdownRow('Expenses', -bk.expense)
    + breakdownRow('Refunds', bk.refund)
    + breakdownRow('Transfers out', -bk.transferOut)
    + breakdownRow('Transfers in', bk.transferIn)
    + '<div class="recon-row recon-total"><span class="recon-row-label">Computed balance</span><span class="recon-row-val num">' + window.Ledger.fmtMoney(bk.computed, a.currency) + '</span></div>'
    + '</div>';

  var issuesHtml = '';
  if(hasIssues){
    var items = '';
    dupes.forEach(function(t){
      items += '<div class="recon-issue-item">'
        + '<span class="recon-issue-icon">\u26A0</span>'
        + '<span>Possible duplicate: "' + window.Ledger.escapeHtml(t.desc || "Untitled") + '" ' + window.Ledger.fmtMoney(t.amount, a.currency) + ' on ' + t.date + '</span>'
        + '<button class="btn btn-sm" data-recon-goto-tx="' + t.id + '">View</button>'
        + '</div>';
    });
    orphans.forEach(function(t){
      items += '<div class="recon-issue-item">'
        + '<span class="recon-issue-icon">\u26A0</span>'
        + '<span>Transfer has no matching pair \u2014 ' + window.Ledger.fmtMoney(t.amount, a.currency) + ' on ' + t.date + '</span>'
        + '<button class="btn btn-sm" data-recon-goto-tx="' + t.id + '">View</button>'
        + '</div>';
    });
    issuesHtml = '<div class="recon-issues"><div class="recon-issues-title">Issues found</div>' + items + '</div>';
  }

  var html = ''
    + '<div class="modal-head"><h3>Verify: ' + window.Ledger.escapeHtml(a.name) + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="recon-current-bal"><span class="recon-current-label">Current balance</span><span class="recon-current-val num">' + window.Ledger.fmtMoney(bal, a.currency) + '</span></div>'
    + '  <div class="recon-bank-field"><label>What does your bank say?</label><input type="number" id="reconSetBalance" step="0.01" placeholder="' + window.Ledger.fmtMoney(bal, a.currency) + '"></div>'
    + '  <details class="recon-details-section"><summary>How this balance was calculated</summary>' + breakdownHtml + '</details>'
    + (hasIssues ? issuesHtml : '<div class="recon-no-issues">\u2713 No obvious issues detected</div>')
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveReconBtn">Confirm balance</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);

    Array.prototype.forEach.call(document.querySelectorAll("[data-recon-goto-tx]"), function(btn){
      btn.addEventListener("click", function(){
        var txId = btn.getAttribute("data-recon-goto-tx");
        var tx = window.Ledger.DB.transactions.find(function(t){ return t.id === txId; });
        if(tx) window.Ledger.openTxModal(tx);
      });
    });

    document.getElementById("saveReconBtn").addEventListener("click", function(){
      var setBal = document.getElementById("reconSetBalance").value;
      var newBal = (setBal !== "" && !isNaN(parseFloat(setBal))) ? parseFloat(setBal) : bal;
      var txSum = bal - (a.openingBalance || 0);
      var newOpening = newBal - txSum;
      var rec = Object.assign({}, a, {
        openingBalance: Math.round(newOpening * 100) / 100,
        reconciledBalance: Math.round(newBal * 100) / 100,
        reconciledAt: Date.now()
      });
      window.Ledger.updateAccount(rec);
      window.Ledger.closeModal();
      window.Ledger.showToast("Balance verified for " + a.name);
    });
  });
};

/* ---------- Update balance modal ---------- */
window.Ledger.openUpdateBalanceModal = function(id){
  var a = window.Ledger.findAccount(id);
  if(!a) return;
  var bal = window.Ledger.accountBalance(a.id);

  var html = ''
    + '<div class="modal-head"><h3>Update: ' + window.Ledger.escapeHtml(a.name) + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="recon-current-bal"><span class="recon-current-label">Computed balance</span><span class="recon-current-val num">' + window.Ledger.fmtMoney(bal, a.currency) + '</span></div>'
    + '  <div class="field"><label>What is the correct balance?</label><input type="number" id="ubSetBalance" step="0.01" placeholder="' + window.Ledger.fmtMoney(bal, a.currency) + '"></div>'
    + '  <p class="faint" style="font-size:11px; margin:0;">This adjusts the opening balance so the computed balance matches. Use this when the app balance doesn\'t match your bank.</p>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveUbBtn">Update balance</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("saveUbBtn").addEventListener("click", function(){
      var setBal = document.getElementById("ubSetBalance").value;
      if(setBal === "" || isNaN(parseFloat(setBal))){ window.Ledger.showToast("Enter a balance"); return; }
      var target = parseFloat(setBal);
      var txSum = bal - (a.openingBalance || 0);
      var newOpening = target - txSum;
      var rec = Object.assign({}, a, {
        openingBalance: Math.round(newOpening * 100) / 100,
        reconciledBalance: Math.round(target * 100) / 100,
        reconciledAt: Date.now()
      });
      window.Ledger.updateAccount(rec);
      window.Ledger.closeModal();
      window.Ledger.showToast("Balance updated for " + a.name);
    });
  });
};

/* ---------- Delete account modal ---------- */
window.Ledger.openDeleteAccountModal = function(id){
  var a = window.Ledger.findAccount(id);
  if(!a) return;
  var txCount = window.Ledger.DB.transactions.filter(function(t){ return t.account === id || (t.fromType==="account" && t.fromId===id) || (t.toType==="account" && t.toId===id); }).length;

  var html = ''
    + '<div class="modal-head"><h3>Delete account</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <p style="font-size:13px; margin:0;">Are you sure you want to delete <b>' + window.Ledger.escapeHtml(a.name) + '</b>?</p>'
    + (txCount > 0 ? '<p style="font-size:12px; color:var(--clay); margin:8px 0 0;">This will also delete ' + txCount + ' transaction' + (txCount !== 1 ? 's' : '') + ' linked to this account.</p>' : '')
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-danger" id="confirmDeleteBtn">Delete account</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("confirmDeleteBtn").addEventListener("click", function(){
      window.Ledger.deleteAccount(id);
      window.Ledger.closeModal();
    });
  });
};

})();