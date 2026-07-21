window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderAccountsPage = function(){
  var DB = window.Ledger.DB;
  var ACCOUNT_TYPES = window.Ledger.ACCOUNT_TYPES;
  var OWNERS = window.Ledger.ACCOUNT_OWNERS || [];
  var accountBalance = window.Ledger.accountBalance;
  var fmtMoney = window.Ledger.fmtMoney;
  var escHtml = window.Ledger.escapeHtml;

  function badgeHtml(badge){
    if(!badge) return '';
    if(badge === 'needs_verify') return '<span class="acct-badge needs-verify">Verify</span>';
    if(badge === 'drift') return '<span class="acct-badge drift">Drift</span>';
    return '';
  }

  function acctBadge(a){
    var bal = accountBalance(a.id);
    var drift = (a.reconciledBalance !== null && a.reconciledBalance !== undefined) ? Math.round((bal - a.reconciledBalance) * 100) / 100 : null;
    if(window.Ledger.needsVerification(a)) return 'needs_verify';
    if(drift !== null && drift !== 0) return 'drift';
    return null;
  }

  function kebabHtml(id){
    return '<div class="kw" data-kebab="'+id+'">'
      + '<button class="kb" data-kebab-toggle="'+id+'" title="Actions">&#8942;</button>'
      + '<div class="km">'
      + '<button class="ki" data-action="edit" data-id="'+id+'"><span class="ico">&#9998;</span> Edit</button>'
      + '<button class="ki" data-action="update-balance" data-id="'+id+'"><span class="ico">&#9878;</span> Update balance</button>'
      + '<button class="ki" data-action="reconcile" data-id="'+id+'"><span class="ico">&#128269;</span> Reconcile</button>'
      + '<button class="ki" data-action="archive" data-id="'+id+'"><span class="ico">&#128230;</span> Archive</button>'
      + '<div class="kd"></div>'
      + '<button class="ki danger" data-action="delete" data-id="'+id+'"><span class="ico">&#128465;</span> Delete</button>'
      + '</div>'
      + '</div>';
  }

  function renderTile(a){
    var bal = accountBalance(a.id);
    var negCls = bal < 0 ? ' neg' : '';
    var creditCls = a.type === 'credit_card' ? ' kind-credit' : '';
    var badge = acctBadge(a);
    return '<div class="tile' + creditCls + '" data-acct-click="' + a.id + '">'
      + '<div class="tile-init ' + a.type + '">' + (a.name||'?')[0].toUpperCase() + '</div>'
      + '<div class="tile-name">' + escHtml(a.name) + '</div>'
      + '<div class="tile-meta"><span class="dot ' + a.type + '"></span> '
      + '<span class="cur-tag ' + a.currency + '">' + a.currency + '</span> '
      + badgeHtml(badge) + '</div>'
      + '<div class="tile-bal' + negCls + '">' + fmtMoney(bal, a.currency) + '</div>'
      + '<div class="tile-kebab">' + kebabHtml(a.id) + '</div>'
      + '</div>';
  }

  var active = DB.accounts.filter(function(a){ return !a.archived; });
  var archived = DB.accounts.filter(function(a){ return a.archived; });

  // Net worth banner per owner
  var nwHtml = '<div class="nw-label">Net Worth</div><div class="nw-groups">';
  OWNERS.forEach(function(o){
    var ownerAccts = active.filter(function(a){ return a.owner === o.id; });
    if(!ownerAccts.length) return;
    var nwByCur = {};
    ownerAccts.forEach(function(a){ nwByCur[a.currency] = (nwByCur[a.currency]||0) + accountBalance(a.id); });
    var curParts = Object.keys(nwByCur).map(function(c){
      var cls = nwByCur[c] >= 0 ? 'pos' : 'neg';
      return '<div class="nw-cur-row"><span class="nw-cur-tag ' + c + '">' + c + '</span> <span class="nw-cur-val ' + cls + '">' + fmtMoney(nwByCur[c], c) + '</span></div>';
    }).join('');
    nwHtml += '<div class="nw-group-col">'
      + '<div class="nw-group-name">' + escHtml(o.label) + '</div>'
      + curParts
      + '</div>';
  });
  var ungrouped = active.filter(function(a){ return !OWNERS.find(function(o){ return o.id === a.owner; }); });
  if(ungrouped.length){
    var nwByCurU = {};
    ungrouped.forEach(function(a){ nwByCurU[a.currency] = (nwByCurU[a.currency]||0) + accountBalance(a.id); });
    var curPartsU = Object.keys(nwByCurU).map(function(c){
      var cls = nwByCurU[c] >= 0 ? 'pos' : 'neg';
      return '<div class="nw-cur-row"><span class="nw-cur-tag ' + c + '">' + c + '</span> <span class="nw-cur-val ' + cls + '">' + fmtMoney(nwByCurU[c], c) + '</span></div>';
    }).join('');
    nwHtml += '<div class="nw-group-col">'
      + '<div class="nw-group-name">Ungrouped</div>'
      + curPartsU
      + '</div>';
  }
  nwHtml += '</div>';

  // Groups section
  var groups = DB.groups || [];
  var groupsHtml = '<div class="groups-section">'
    + '<div class="groups-header"><span class="groups-title">Groups</span></div>'
    + '<div class="groups-list">';
  groups.forEach(function(g){
    var cnt = active.filter(function(a){ return a.owner === g.id; }).length;
    groupsHtml += '<div class="group-chip">'
      + escHtml(g.name) + ' <span class="group-count">' + cnt + '</span>'
      + ' <span class="group-edit" data-edit-group="' + g.id + '" title="Edit">&#9998;</span>'
      + ' <span class="group-del" data-del-group="' + g.id + '" title="Delete">&times;</span>'
      + '</div>';
  });
  groupsHtml += '<button class="add-group-btn" id="addGroupBtn">+ Add group</button>'
    + '</div></div>';

  // Card grid grouped by owner
  var cardHtml = '';
  OWNERS.forEach(function(o){
    var ownerAccts = active.filter(function(a){ return a.owner === o.id; });
    if(!ownerAccts.length) return;
    cardHtml += '<div class="owner-group">'
      + '<div class="owner-header"><div class="owner-left"><div class="owner-avatar ' + o.cls + '">' + o.avatar + '</div><span class="owner-name">' + escHtml(o.label) + '</span> <span class="owner-count">' + ownerAccts.length + '</span></div></div>'
      + '<div class="card-grid">';
    ownerAccts.forEach(function(a){ cardHtml += renderTile(a); });
    cardHtml += '</div></div>';
  });
  if(ungrouped.length){
    cardHtml += '<div class="owner-group"><div class="owner-header"><div class="owner-left"><span class="owner-name">Ungrouped</span> <span class="owner-count">' + ungrouped.length + '</span></div></div><div class="card-grid">';
    ungrouped.forEach(function(a){ cardHtml += renderTile(a); });
    cardHtml += '</div></div>';
  }
  if(!active.length){
    cardHtml = '<div class="empty-state"><div class="big">No accounts yet</div>Add your first account to get started.</div>';
  }

  var archivedHtml = archived.length
    ? '<div class="card card-pad section-gap">'
    + '<h2 style="font-size:16px; font-weight:800; margin:0 0 14px; color:var(--text-faint);">Archived</h2>'
    + '<div style="display:flex; flex-direction:column; gap:10px;">'
    + archived.map(function(a){
      var bal = accountBalance(a.id);
      return '<div class="acct-card archived" data-acct-click="' + a.id + '">'
        + '<div class="acct-card-left"><div class="nm">' + escHtml(a.name) + ' <span class="faint">(archived)</span></div></div>'
        + '<div class="acct-card-right"><div class="bal num">' + fmtMoney(bal, a.currency) + '</div>'
        + '<div class="acct-card-actions"><button class="icon-btn" data-unarchive-acct="' + a.id + '" title="Unarchive"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button></div>'
        + '</div></div>';
    }).join("")
    + '</div></div>'
    : '';

  return ''
    + '<div id="nwBanner" class="card card-pad">' + nwHtml + '</div>'
    + groupsHtml
    + '<div id="cardGrid">' + cardHtml + '</div>'
    + archivedHtml;
};
