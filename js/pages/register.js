/* ============================================================
   TRANSACTIONS PAGE  v3 — year > month grouped layout
   ============================================================ */
window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

/* ---- state ---- */
window.Ledger.registerFilters = { account:"all", currency:"all", category:"all", subcategory:"all", type:"all", datePreset:"all", dateFrom:"", dateTo:"", search:"" };
window.Ledger.registerMonthsVisible = 2;
window.Ledger.registerCollapsedYears = {};
window.Ledger.registerCollapsedMonths = {};

var INITIAL_MONTHS = 2;
var LOAD_MORE_MONTHS = 2;

/* ---- helpers ---- */
window.Ledger.yearKeyOf = function(dateStr){ return dateStr.slice(0,4); };

window.Ledger.monthLabelOf = function(mk){
  var names = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return names[parseInt(mk.slice(5,7),10)-1];
};

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
    if(f.subcategory !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.subcategoryId === f.subcategory; })) return false;
      } else if(t.subcategory !== f.subcategory) return false;
    }
    if(!window.Ledger.matchesDatePreset(t.date, f.datePreset, f.dateFrom, f.dateTo)) return false;
    if(f.search && f.search.trim()){
      var q = f.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

window.Ledger.getCategoriesForType = function(type){
  var cats = window.Ledger.DB.categories;
  if(type && type !== "all"){
    cats = cats.filter(function(c){ return c.type === type; });
  }
  return cats;
};

window.Ledger.getSubsForFilter = function(type, categoryId){
  if(categoryId && categoryId !== "all"){
    var cat = window.Ledger.findCategory(categoryId);
    if(!cat || !cat.subs || !cat.subs.length) return [];
    return cat.subs;
  }
  var allCats = window.Ledger.getCategoriesForType(type);
  var subs = [];
  allCats.forEach(function(c){
    if(c.subs) c.subs.forEach(function(s){ subs.push(s); });
  });
  return subs;
};

/* ---- get all unique month keys in descending order ---- */
function getVisibleMonthKeys(sorted){
  var seen = {};
  var keys = [];
  sorted.forEach(function(t){
    var mk = window.Ledger.monthKeyOf(t.date);
    if(!seen[mk]){ seen[mk] = true; keys.push(mk); }
  });
  return keys;
}

/* ---- toggle functions (called from onclick) ---- */
window.Ledger.toggleRegYear = function(yk){
  window.Ledger.registerCollapsedYears[yk] = !window.Ledger.registerCollapsedYears[yk];
  window.Ledger.navigateTo("transactions");
};
window.Ledger.toggleRegMonth = function(mk){
  window.Ledger.registerCollapsedMonths[mk] = !window.Ledger.registerCollapsedMonths[mk];
  window.Ledger.navigateTo("transactions");
};
window.Ledger.loadRegEarlierMonths = function(){
  window.Ledger.registerMonthsVisible += LOAD_MORE_MONTHS;
  window.Ledger.navigateTo("transactions");
};

/* ============================================================
   RENDER
   ============================================================ */
window.Ledger.pages.renderTransactionsPage = function(){
  var sorted = window.Ledger.filteredTransactions().sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); });

  var allMonthKeys = getVisibleMonthKeys(sorted);
  var visibleMonthKeys = allMonthKeys.slice(0, window.Ledger.registerMonthsVisible);

  var hasAnyTx = window.Ledger.DB.transactions.length > 0;
  var isEmpty = sorted.length === 0;

  /* ---- Running balance (for single-account view) ---- */
  var showRunning = window.Ledger.registerFilters.account !== "all";
  var runBalMap = {};
  if(showRunning){
    var acc = window.Ledger.findAccount(window.Ledger.registerFilters.account);
    if(acc){
      var noDecimals = acc.currency === "JPY";
      var chrono = window.Ledger.DB.transactions.filter(function(t){
        return (t.account === acc.id) || (t.fromType==="account"&&t.fromId===acc.id) || (t.toType==="account"&&t.toId===acc.id);
      }).sort(function(a,b){ return (a.date+a.id).localeCompare(b.date+b.id); });
      var running = acc.openingBalance || 0;
      chrono.forEach(function(t){
        var amt = t.amount;
        if(typeof amt !== "number" || isNaN(amt) || !isFinite(amt)) return;
        if(t.type==="expense" && t.account===acc.id) running -= amt;
        else if(t.type==="income" && t.account===acc.id) running += amt;
        else if(t.type==="refund" && t.account===acc.id) running += amt;
        else if(t.type==="transfer"){
          if(t.pending){
            if(t.fromType==="account" && t.fromId===acc.id) running -= amt;
          } else {
            if(t.fromType==="account" && t.fromId===acc.id) running -= amt;
            if(t.toType==="account" && t.toId===acc.id) running += amt;
          }
        }
        runBalMap[t.id] = noDecimals ? Math.round(running) : Math.round(running * 100) / 100;
      });
    }
  }

  /* ---- Active filter detection ---- */
  var f = window.Ledger.registerFilters;
  var hasActiveFilters = (f.account!=="all" || f.currency!=="all" || f.category!=="all" || f.subcategory!=="all" || f.type!=="all" || f.datePreset!=="all" || f.search.trim()!=="");
  var clearBtnHtml = hasActiveFilters
    ? '<button class="clear-filters" id="clearFiltersBtn">Clear filters</button>'
    : '';
  function filteredCls(val){ return val !== "all" ? ' is-filtered' : ''; }

  /* ---- Type-aware filter options ---- */
  var typeVal = f.type;
  var typeOpts = '<option value="all" ' + (typeVal==="all"?"selected":"") + '>All types</option>'
    + '<option value="expense" ' + (typeVal==="expense"?"selected":"") + '>Expense</option>'
    + '<option value="income" ' + (typeVal==="income"?"selected":"") + '>Income</option>'
    + '<option value="transfer" ' + (typeVal==="transfer"?"selected":"") + '>Transfer</option>'
    + '<option value="refund" ' + (typeVal==="refund"?"selected":"") + '>Refund</option>';

  var filteredCats = window.Ledger.getCategoriesForType(typeVal);
  var catOpts = '<option value="all">All categories</option>' + filteredCats.map(function(c){
    return '<option value="'+c.id+'" '+(f.category===c.id?"selected":"")+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
  }).join("");

  var filteredSubs = window.Ledger.getSubsForFilter(typeVal, f.category);
  var subOpts = '<option value="all">All subcategories</option>' + filteredSubs.map(function(s){
    return '<option value="'+s.id+'" '+(f.subcategory===s.id?"selected":"")+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
  }).join("");

  var accOpts = '<option value="all">All accounts</option>' + window.Ledger.DB.accounts.map(function(a){
    return '<option value="' + a.id + '" ' + (f.account===a.id?'selected':'') + '>' + window.Ledger.escapeHtml(a.name) + '</option>';
  }).join("");

  var curSet = {}; window.Ledger.DB.accounts.forEach(function(a){ curSet[a.currency]=1; });
  var curOpts = '<option value="all">All currencies</option>' + Object.keys(curSet).map(function(c){
    return '<option value="' + c + '" ' + (f.currency===c?'selected':'') + '>' + c + '</option>';
  }).join("");

  /* ---- Toolbar ---- */
  var toolbarHtml = '<div class="filters-bar">'
    + '<select id="fType" class="' + filteredCls(f.type) + '">' + typeOpts + '</select>'
    + '<select id="fAccount" class="' + filteredCls(f.account) + '">' + accOpts + '</select>'
    + '<select id="fCurrency" class="' + filteredCls(f.currency) + '">' + curOpts + '</select>'
    + '<select id="fCategory" class="' + filteredCls(f.category) + '">' + catOpts + '</select>'
    + '<select id="fSubcategory" class="' + filteredCls(f.subcategory) + '">' + subOpts + '</select>'
    + '<select id="fDatePreset" class="' + filteredCls(f.datePreset) + '">' + window.Ledger.DATE_PRESETS.map(function(p){
      return '<option value="'+p.id+'" '+(f.datePreset===p.id?"selected":"")+'>'+p.label+'</option>';
    }).join("") + '</select>'
    + clearBtnHtml
    + '<button class="btn btn-sm" id="checkDupesBtn"' + (!hasAnyTx ? ' disabled' : '') + '>Check duplicates</button>'
    + '<button class="btn btn-sm" id="exportCsvBtn"' + (!hasAnyTx ? ' disabled title="Add transactions before exporting"' : '') + '>Export CSV</button>'
    + '</div>';

  /* ---- Column headers ---- */
  var colHdrCls = 'grp-col-header';
  if(showRunning) colHdrCls += ' show-runbal';
  var colHeaders = '<div class="' + colHdrCls + '">'
    + '<span>Date</span>'
    + '<span>Description</span>'
    + '<span>Type</span>'
    + '<span>Category</span>'
    + '<span>Account</span>'
    + '<span>Amount</span>'
    + (showRunning ? '<span>Balance</span>' : '')
    + '</div>';

  /* ---- Transaction list or empty state ---- */
  var listHtml;
  if(isEmpty){
    if(hasAnyTx){
      listHtml = '<div class="tx-empty">'
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
      listHtml = '<div class="tx-empty">'
        + '<div class="empty-state">'
        + '<div class="empty-icon empty-icon--line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/>'
        + '</svg></div>'
        + '<div class="big">No transactions yet</div>'
        + '<div class="empty-desc">Start tracking your finances by adding your first transaction or importing a bank statement.</div>'
        + '<div class="empty-tip">Tip: Import a CSV or PDF bank statement to quickly populate your transactions.</div>'
        + '<div class="empty-cta" style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">'
        + '<button class="btn btn-sm btn-primary" onclick="window.Ledger.openTxModal(null)">+ New transaction</button>'
        + '<button class="btn btn-sm" onclick="window.Ledger.navigateTo(\'settings\')">Import statement</button>'
        + '</div></div></div>';
    }
  } else {
    listHtml = renderYearMonthGrouped(sorted, visibleMonthKeys, allMonthKeys, showRunning, runBalMap);
  }

  /* ---- Upcoming scheduled banner ---- */
  var upcomingHtml = "";
  var todayISO = window.Ledger.todayISO();
  var rangeEnd = null;
  if(f.datePreset === "custom" && f.dateTo) rangeEnd = f.dateTo;
  else if(f.datePreset === "all") rangeEnd = "9999-12-31";
  else if(f.datePreset === "year") rangeEnd = new Date().getFullYear() + "-12-31";
  if(rangeEnd && rangeEnd > todayISO){
    var upcomingCount = window.Ledger.DB.recurring.filter(function(r){
      return r.startDate && r.startDate > todayISO && r.startDate <= rangeEnd;
    }).length;
    if(upcomingCount > 0){
      upcomingHtml = '<div class="upcoming-banner">'
        + '<span class="upcoming-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>'
        + '<span>' + upcomingCount + ' upcoming scheduled transaction' + (upcomingCount !== 1 ? 's' : '') + ' in this period</span>'
        + '<a href="#" class="upcoming-link" data-nav-link="scheduled">View</a>'
        + '</div>';
    }
  }

  /* ---- Transactions header ---- */
  var cardCls = showRunning ? ' id="txCard" class="tx-card-with-runbal"' : ' id="txCard"';
  return ''
    + '<div' + cardCls + '>'
    + '<div class="reg-section">' + toolbarHtml + '</div>'
    + (upcomingHtml ? '<div class="reg-section">' + upcomingHtml + '</div>' : '')
    + '<div class="reg-section">' + colHeaders + '</div>'
    + '<div class="reg-section">' + listHtml + '</div>'
    + '</div>';
};

/* ============================================================
   YEAR > MONTH GROUPED RENDERING
   ============================================================ */
function renderYearMonthGrouped(sorted, visibleMonthKeys, allMonthKeys, showRunning, runBalMap){
  var cy = window.Ledger.registerCollapsedYears;
  var cm = window.Ledger.registerCollapsedMonths;

  /* build year → months map from visible months only */
  var yearGroups = {};
  sorted.forEach(function(t){
    var yk = window.Ledger.yearKeyOf(t.date);
    var mk = window.Ledger.monthKeyOf(t.date);
    if(visibleMonthKeys.indexOf(mk) === -1) return;
    if(!yearGroups[yk]) yearGroups[yk] = {};
    if(!yearGroups[yk][mk]) yearGroups[yk][mk] = [];
    yearGroups[yk][mk].push(t);
  });

  var yearKeys = Object.keys(yearGroups).sort().reverse();

  var html = "";
  yearKeys.forEach(function(yk){
    var months = yearGroups[yk];
    var monthKeys = Object.keys(months).sort().reverse();

    var yearInc = 0, yearExp = 0, yearCount = 0;
    monthKeys.forEach(function(mk){
      months[mk].forEach(function(t){
        yearCount++;
        if(t.type === "income") yearInc += t.amount;
        else yearExp += t.amount;
      });
    });

    var isYearCollapsed = cy[yk];
    html += '<div class="yr-section' + (isYearCollapsed ? ' collapsed' : '') + '">';
    html += '<div class="yr-header" onclick="window.Ledger.toggleRegYear(\'' + yk + '\')">';
    html += '<div class="yr-title"><span class="yr-chevron">\u25BC</span> ' + yk + ' <span class="yr-count">(' + yearCount + ' txns)</span></div>';
    html += '<div class="yr-summary">';
    html += '<span class="pos">+' + window.Ledger.fmtMoneyShort(yearInc) + '</span>';
    html += '<span class="neg">\u2212' + window.Ledger.fmtMoneyShort(yearExp) + '</span>';
    html += '</div></div>';
    html += '<div class="yr-body" style="max-height:' + (isYearCollapsed ? 0 : (yearCount * 48 + monthKeys.length * 40)) + 'px;">';

    monthKeys.forEach(function(mk){
      var txs = months[mk];
      var inc = 0, exp = 0;
      txs.forEach(function(t){
        if(t.type === "income") inc += t.amount;
        else exp += t.amount;
      });

      var isMonthCollapsed = cm[mk];
      var bodyMaxH = isMonthCollapsed ? 0 : (txs.length * 48);

      html += '<div class="mo-section' + (isMonthCollapsed ? ' collapsed' : '') + '">';
      html += '<div class="mo-header" onclick="window.Ledger.toggleRegMonth(\'' + mk + '\')">';
      html += '<div class="mo-title"><span class="mo-chevron">\u25BC</span> ' + window.Ledger.monthLabelOf(mk) + ' <span class="mo-count">(' + txs.length + ')</span></div>';
      html += '<div class="mo-summary">';
      html += '<span class="pos">+' + window.Ledger.fmtMoneyShort(inc) + '</span>';
      html += '<span class="neg">\u2212' + window.Ledger.fmtMoneyShort(exp) + '</span>';
      html += '</div></div>';
      html += '<div class="mo-body" style="max-height:' + bodyMaxH + 'px;">';

      txs.forEach(function(t){
        html += renderGroupedTxRow(t, showRunning, runBalMap);
      });

      html += '</div></div>';
    });

    html += '</div></div>';
  });

  /* ---- "Load earlier months" button ---- */
  if(visibleMonthKeys.length < allMonthKeys.length){
    var remaining = allMonthKeys.length - visibleMonthKeys.length;
    var nextMk = allMonthKeys[visibleMonthKeys.length];
    var nextLabel = window.Ledger.monthLabelOf(nextMk);
    html += '<button class="load-earlier" onclick="window.Ledger.loadRegEarlierMonths()">';
    html += '\u2191 Load earlier months';
    html += '<span class="load-earlier-sub">' + remaining + ' month' + (remaining > 1 ? 's' : '') + ' remaining (' + nextLabel + ' \u2190)</span>';
    html += '</button>';
  }

  return html;
}

/* ============================================================
   SIMPLIFIED TX ROW for grouped layout (matches test-groups.html)
   ============================================================ */
function renderGroupedTxRow(t, showRunning, runBalMap){
  var isLinkedTransfer = !!t.linkId;
  var dateDisp = new Date(t.date + "T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});

  var catLabel = "";
  if(t.categorySplits && t.categorySplits.length){
    catLabel = "split: " + t.categorySplits.map(function(s){ return window.Ledger.categoryName(s.categoryId); }).join(", ");
  } else if(t.category){
    catLabel = window.Ledger.categoryName(t.category);
    if(t.subcategory) catLabel += " › " + window.Ledger.subcatName(t.category, t.subcategory);
  }

  var acctLabel = "";
  if(t.type === "transfer"){
    var fr = window.Ledger.entityRef(t.fromType, t.fromId);
    var to = window.Ledger.entityRef(t.toType, t.toId);
    acctLabel = (fr?fr.name:"?") + " → " + (to?to.name:"?");
  } else {
    var accObj = window.Ledger.findAccount(t.account);
    acctLabel = accObj ? accObj.name : "?";
  }

  var descLabel = t.desc || "";
  if(t.type === "transfer" && !descLabel) descLabel = "Transfer";
  if(t.type === "refund" && t.refundOf){
    var origTx = window.Ledger.DB.transactions.find(function(x){ return x.id === t.refundOf; });
    descLabel = "Refund: " + window.Ledger.escapeHtml(origTx ? (origTx.desc || "transaction") : "original");
  }

  var typeColor = t.type==="expense"?"var(--clay)":t.type==="income"?"var(--sage)":t.type==="refund"?"var(--sage)":"var(--brass)";
  var typeLabel = t.type.charAt(0).toUpperCase() + t.type.slice(1);
  var sign = t.type==="income" ? "+" : (t.type==="refund" ? "+" : "\u2212");
  var amtCls = (t.type==="income"||t.type==="refund") ? "pos" : "neg";
  if(t.type === "transfer"){ sign = ""; amtCls = ""; }

  var currency = "USD";
  if(t.account){ var a=window.Ledger.findAccount(t.account); if(a)currency=a.currency; }
  else if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); if(a2)currency=a2.currency; }

  var runBalHtml = "";
  if(showRunning && runBalMap[t.id] != null){
    runBalHtml = '<span class="grp-runbal">' + window.Ledger.fmtMoney(runBalMap[t.id], currency) + '</span>';
  } else if(showRunning){
    runBalHtml = '<span class="grp-runbal">—</span>';
  }

  var notesIcon = t.notes ? '<span class="grp-notes" title="' + window.Ledger.escapeHtml(t.notes) + '">📝</span>' : '';
  var runbalCls = showRunning ? ' show-runbal' : '';

  return '<div class="grp-row" data-tx="' + t.id + '">'
    + '<span class="grp-date">' + dateDisp + '</span>'
    + '<span class="grp-desc">' + window.Ledger.escapeHtml(descLabel) + notesIcon + '</span>'
    + '<span class="grp-type"><span class="grp-type-dot" style="background:' + typeColor + ';"></span>' + typeLabel + '</span>'
    + '<span class="grp-cat">' + catLabel + '</span>'
    + '<span class="grp-acct">' + window.Ledger.escapeHtml(acctLabel) + '</span>'
    + '<span class="grp-amt ' + amtCls + '">' + sign + window.Ledger.fmtMoney(t.amount, currency) + '</span>'
    + runBalHtml
    + '<div class="grp-kebab">'
    + '  <button class="kebab-btn" data-kebab="' + t.id + '" title="More actions">&#8942;</button>'
    + '  <div class="kebab-menu" id="kebab-' + t.id + '">'
    + '    <button class="kebab-item" data-edit-tx="' + t.id + '"><span class="kebab-icon">\u270F</span> Edit</button>'
    + '    <div class="kebab-divider"></div>'
    + '    <button class="kebab-item danger" data-del-tx="' + t.id + '"><span class="kebab-icon">\uD83D\uDDD1</span> Delete</button>'
    + '  </div>'
    + '</div>'
    + '</div>';
}
