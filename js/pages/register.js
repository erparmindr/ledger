/* ============================================================
   REGISTER PAGE
   ============================================================ */
window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.registerFilters = { account:"all", currency:"all", category:"all", subcategory:"all", type:"all", datePreset:"all", dateFrom:"", dateTo:"", search:"" };

window.Ledger.matchesDatePreset = function(dateStr, preset, from, to){
  if(preset === "all") return true;
  var d = new Date(dateStr + "T00:00:00");
  var now = new Date();
  if(preset === "today"){ return dateStr === window.Ledger.todayISO(); }
  if(preset === "week"){
    var weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
    return d >= weekAgo && d <= now;
  }
  if(preset === "month"){ return window.Ledger.monthKeyOf(dateStr) === window.Ledger.monthKeyOf(window.Ledger.todayISO()); }
  if(preset === "year"){ return d.getFullYear() === now.getFullYear(); }
  if(preset === "custom"){
    if(from && dateStr < from) return false;
    if(to && dateStr > to) return false;
    return true;
  }
  return true;
};

window.Ledger.filteredTransactions = function(){
  var f = window.Ledger.registerFilters;
  return window.Ledger.DB.transactions.filter(function(t){
    if(f.type !== "all" && t.type !== f.type) return false;
    if(f.account !== "all"){
      var touchesAccount = (t.account === f.account) ||
        (t.fromType==="account" && t.fromId===f.account) ||
        (t.toType==="account" && t.toId===f.account);
      if(!touchesAccount) return false;
    }
    if(f.currency !== "all"){
      var cur = null;
      if(t.account){ var a = window.Ledger.findAccount(t.account); cur = a ? a.currency : null; }
      else if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); cur = a2?a2.currency:null; }
      else if(t.toType==="account"){ var a3=window.Ledger.findAccount(t.toId); cur = a3?a3.currency:null; }
      if(cur !== f.currency) return false;
    }
    if(f.category !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.categoryId === f.category; })) return false;
      } else if(t.category !== f.category) return false;
    }
    if(f.subcategory !== "all" && t.subcategory !== f.subcategory) return false;
    if(!window.Ledger.matchesDatePreset(t.date, f.datePreset, f.dateFrom, f.dateTo)) return false;
    if(f.search && f.search.trim()){
      var q = f.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

window.Ledger.pages.renderRegisterPage = function(){
  var list = window.Ledger.filteredTransactions().sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); });
  var showRunning = window.Ledger.registerFilters.account !== "all";
  var runBalMap = {};
  if(showRunning){
    var acc = window.Ledger.findAccount(window.Ledger.registerFilters.account);
    if(acc){
      var chrono = window.Ledger.DB.transactions.filter(function(t){
        return (t.account === acc.id) || (t.fromType==="account"&&t.fromId===acc.id) || (t.toType==="account"&&t.toId===acc.id);
      }).sort(function(a,b){ return (a.date+a.id).localeCompare(b.date+b.id); });
      var running = acc.openingBalance || 0;
      chrono.forEach(function(t){
        if(t.type==="expense" && t.account===acc.id) running -= t.amount;
        else if(t.type==="income" && t.account===acc.id) running += t.amount;
        else if(t.type==="refund" && t.account===acc.id) running += t.amount;
        else if(t.type==="transfer"){
          if(t.pending){
            if(t.fromType==="account" && t.fromId===acc.id) running -= t.amount;
          } else {
            if(t.fromType==="account" && t.fromId===acc.id) running -= t.amount;
            if(t.toType==="account" && t.toId===acc.id) running += t.amount;
          }
        }
        runBalMap[t.id] = running;
      });
    }
  }

  var hasAnyTx = window.Ledger.DB.transactions.length > 0;
  var isEmpty = list.length === 0;

  /* ---- Summary stats ---- */
  var totalIncome = 0, totalExpense = 0, totalTransfer = 0;
  list.forEach(function(t){
    if(t.type === "income") totalIncome += t.amount;
    else if(t.type === "expense") totalExpense += t.amount;
    else if(t.type === "transfer") totalTransfer++;
    else if(t.type === "refund") totalExpense -= t.amount;
  });

  var chipsHtml = '<div class="reg-summary">'
    + '<div class="reg-chip dot-sage"><span class="chip-dot"></span>Income <span class="chip-val pos">+' + window.Ledger.fmtMoneyShort(totalIncome) + '</span></div>'
    + '<div class="reg-chip dot-clay"><span class="chip-dot"></span>Expenses <span class="chip-val neg">\u2212' + window.Ledger.fmtMoneyShort(totalExpense) + '</span></div>'
    + '<div class="reg-chip dot-brass"><span class="chip-dot"></span>Transfers <span class="chip-val">' + totalTransfer + '</span></div>'
    + '<div class="reg-chip dot-dim"><span class="chip-dot"></span>' + list.length + ' transaction' + (list.length !== 1 ? 's' : '') + '</div>'
    + '</div>';

  /* ---- Filter options ---- */
  var accOpts = '<option value="all">All accounts</option>' + window.Ledger.DB.accounts.map(function(a){
    return '<option value="' + a.id + '" ' + (window.Ledger.registerFilters.account===a.id?'selected':'') + '>' + window.Ledger.escapeHtml(a.name) + '</option>';
  }).join("");
  var curSet = {}; window.Ledger.DB.accounts.forEach(function(a){ curSet[a.currency]=1; });
  var curOpts = '<option value="all">All currencies</option>' + Object.keys(curSet).map(function(c){
    return '<option value="' + c + '" ' + (window.Ledger.registerFilters.currency===c?'selected':'') + '>' + c + '</option>';
  }).join("");
  var subOpts = '<option value="all">All subcategories</option>';
  if(window.Ledger.registerFilters.category !== "all"){
    var cat = window.Ledger.findCategory(window.Ledger.registerFilters.category);
    if(cat && cat.subs.length){
      subOpts += cat.subs.map(function(s){
        return '<option value="' + s.id + '" ' + (window.Ledger.registerFilters.subcategory===s.id?'selected':'') + '>' + window.Ledger.escapeHtml(s.name) + '</option>';
      }).join("");
    }
  }

  /* ---- Active filter detection ---- */
  var f = window.Ledger.registerFilters;
  var hasActiveFilters = (f.account!=="all" || f.currency!=="all" || f.category!=="all" || f.subcategory!=="all" || f.type!=="all" || f.datePreset!=="all" || f.search.trim()!=="");
  var clearBtnHtml = hasActiveFilters
    ? '<button class="clear-filters" id="clearFiltersBtn">Clear filters</button>'
    : '';
  function filteredCls(val){ return val !== "all" ? ' is-filtered' : ''; }

  /* ---- Category select ---- */
  var catOpts = '<option value="all"' + (f.category==="all"?" selected":"") + '>All categories</option>'
    + window.Ledger.DB.categories.map(function(c){
      return '<option value="'+c.id+'" '+(f.category===c.id?"selected":"")+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");

  /* ---- Toolbar: filters + export ---- */
  var toolbarHtml = '<div class="filters-bar">'
    + '<select id="fAccount" class="' + filteredCls(f.account) + '">' + accOpts + '</select>'
    + '<select id="fCurrency" class="' + filteredCls(f.currency) + '">' + curOpts + '</select>'
    + '<select id="fCategory" class="' + filteredCls(f.category) + '">' + catOpts + '</select>'
    + '<select id="fSubcategory" class="' + filteredCls(f.subcategory) + '">' + subOpts + '</select>'
    + '<select id="fType" class="' + filteredCls(f.type) + '">'
    + '  <option value="all" ' + (f.type==="all"?"selected":"") + '>All types</option>'
    + '  <option value="expense" ' + (f.type==="expense"?"selected":"") + '>Expense</option>'
    + '  <option value="income" ' + (f.type==="income"?"selected":"") + '>Income</option>'
    + '  <option value="transfer" ' + (f.type==="transfer"?"selected":"") + '>Transfer</option>'
    + '  <option value="refund" ' + (f.type==="refund"?"selected":"") + '>Refund</option>'
    + '</select>'
    + '<select id="fDatePreset" class="' + filteredCls(f.datePreset) + '">' + window.Ledger.DATE_PRESETS.map(function(p){
      return '<option value="'+p.id+'" '+(f.datePreset===p.id?"selected":"")+'>'+p.label+'</option>';
    }).join("") + '</select>'
    + (f.datePreset === "custom" ? (
      '<input type="date" id="fDateFrom" value="' + f.dateFrom + '">'
      + '<input type="date" id="fDateTo" value="' + f.dateTo + '">'
    ) : "")
    + clearBtnHtml
    + '<button class="btn btn-sm" id="exportCsvBtn"' + (!hasAnyTx ? ' disabled title="Add transactions before exporting"' : '') + '>Export CSV</button>'
    + '</div>';

  /* ---- Column headers (always shown) ---- */
  var colHdrCls = 'tx-col-header show-type show-cat show-acct';
  if(showRunning) colHdrCls += ' show-runbal';
  var colHeaders = '<div class="' + colHdrCls + '">'
    + '<span class="col-date">Date</span>'
    + '<span class="col-desc">Description</span>'
    + '<span class="col-type">Type</span>'
    + '<span class="col-cat">Category</span>'
    + '<span class="col-acct">Account</span>'
    + '<span class="col-amt">Amount</span>'
    + (showRunning ? '<span class="col-runbal">Balance</span>' : '')
    + '</div>';

  /* ---- Transaction list or empty state ---- */
  var listHtml;
  if(isEmpty){
    if(hasAnyTx){
      listHtml = '<div class="register-empty">'
        + '<div class="empty-state">'
        + '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/>'
        + '</svg></div>'
        + '<div class="big">No matching transactions</div>'
        + '<div class="empty-desc">Try adjusting your filters or search query to find what you\'re looking for.</div>'
        + '<div class="empty-cta" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">'
        + (hasActiveFilters ? '<button class="btn btn-sm" id="clearFiltersBtn2">Clear filters</button>' : '')
        + '<button class="btn btn-sm btn-primary" onclick="window.Ledger.openTxModal(null)">+ New transaction</button>'
        + '</div></div></div>';
    } else {
      listHtml = '<div class="register-empty">'
        + '<div class="empty-state">'
        + '<div class="empty-icon empty-icon--line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>'
        + '</svg></div>'
        + '<div class="big">No transactions yet</div>'
        + '<div class="empty-desc">Start tracking your finances by adding your first transaction or importing a bank statement.</div>'
        + '<div class="empty-tip">Tip: Import a CSV or PDF bank statement to quickly populate your register.</div>'
        + '<div class="empty-cta" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">'
        + '<button class="btn btn-sm btn-primary" onclick="window.Ledger.openTxModal(null)">+ New transaction</button>'
        + '<button class="btn btn-sm" onclick="window.Ledger.navigateTo(\'settings\')">Import statement</button>'
        + '</div></div></div>';
    }
  } else {
    listHtml = list.map(function(t){ return window.Ledger.renderTxRow(t, {tableLayout:true, showRunningBalance:showRunning, runningBalance:runBalMap[t.id]}); }).join("");
  }

  /* ---- Register header ---- */
  return ''
    + '<div id="registerCard">'
    + '<div class="reg-section">' + toolbarHtml + '</div>'
    + (hasAnyTx ? '<div class="reg-section">' + chipsHtml + '</div>' : '')
    + '<div class="reg-section">'
    + '  <div class="card-header">'
    + '    <div class="reg-header-left"><h2>Register</h2><span class="reg-count">' + list.length + ' transaction' + (list.length !== 1 ? 's' : '') + '</span></div>'
    + '    <span class="hint">' + (showRunning ? 'running balance shown' : '') + '</span>'
    + '  </div>'
    + '</div>'
    + '<div class="reg-section">' + colHeaders + '</div>'
    + '<div class="reg-section">' + listHtml + '</div>'
    + '</div>';
};
