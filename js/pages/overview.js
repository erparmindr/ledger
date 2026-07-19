window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

/* ============================================================
   OVERVIEW STATE (persisted to localStorage)
   ============================================================ */
window.Ledger.overviewState = {
  spendPeriod: "month",
  trendPeriod: "6months"
};
(function(){
  try {
    var saved = JSON.parse(localStorage.getItem("ledger_overview_state"));
    if(saved){
      if(saved.spendPeriod) window.Ledger.overviewState.spendPeriod = saved.spendPeriod;
      if(saved.trendPeriod) window.Ledger.overviewState.trendPeriod = saved.trendPeriod;
    }
  } catch(e){}
})();
window.Ledger.saveOverviewState = function(){
  localStorage.setItem("ledger_overview_state", JSON.stringify(window.Ledger.overviewState));
};

/* ============================================================
   DATE RANGE HELPER
   ============================================================ */
window.Ledger.overviewDateRange = function(preset){
  var now = new Date();
  var from = null, to = null;
  if(preset === "week"){
    from = new Date(now); from.setDate(now.getDate()-6); from.setHours(0,0,0,0);
    to = now;
  } else if(preset === "month"){
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  } else if(preset === "3months"){
    from = new Date(now.getFullYear(), now.getMonth()-2, 1);
    to = now;
  } else if(preset === "6months"){
    from = new Date(now.getFullYear(), now.getMonth()-5, 1);
    to = now;
  } else if(preset === "year"){
    from = new Date(now.getFullYear(), 0, 1);
    to = now;
  }
  var toStr = to ? (to.getFullYear()+"-"+window.Ledger.pad2(to.getMonth()+1)+"-"+window.Ledger.pad2(to.getDate())) : null;
  var fromStr = from ? (from.getFullYear()+"-"+window.Ledger.pad2(from.getMonth()+1)+"-"+window.Ledger.pad2(from.getDate())) : null;
  return {from:fromStr, to:toStr};
};

window.Ledger.overviewMatchDate = function(dateStr, preset){
  if(preset === "all") return true;
  var range = window.Ledger.overviewDateRange(preset);
  if(range.from && dateStr < range.from) return false;
  if(range.to && dateStr > range.to) return false;
  return true;
};

window.Ledger.OVERVIEW_PERIODS = [
  {id:"week", label:"This week"},
  {id:"month", label:"This month"},
  {id:"3months", label:"Last 3 months"},
  {id:"6months", label:"Last 6 months"},
  {id:"year", label:"This year"}
];

window.Ledger.periodLabel = function(id){
  var p = window.Ledger.OVERVIEW_PERIODS.find(function(x){ return x.id===id; });
  return p ? p.label : id;
};

window.Ledger.periodPillHtml = function(selectedId, stateKey){
  var label = window.Ledger.periodLabel(selectedId);
  return '<div class="pill-dropdown" data-pill-dropdown="'+stateKey+'">'
    + '<button class="pill-trigger">'+window.Ledger.escapeHtml(label)+'<svg width="8" height="8" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    + '<div class="pill-menu">'
    + window.Ledger.OVERVIEW_PERIODS.map(function(p){
      return '<div class="pill-option'+(selectedId===p.id?' active':'')+'" data-pill-val="'+p.id+'">'+p.label+'</div>';
    }).join("")
    + '</div></div>';
};

/* ============================================================
   OVERVIEW PAGE
   ============================================================ */
window.Ledger.pages.renderOverviewPage = function(){
  var accs = window.Ledger.activeAccounts();
  var thisMonth = window.Ledger.monthKeyOf(window.Ledger.todayISO());
  var lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth()-1);
  var lastMonthKey = lastMonth.getFullYear()+"-"+window.Ledger.pad2(lastMonth.getMonth()+1);
  var spendPeriod = window.Ledger.overviewState.spendPeriod;
  var trendPeriod = window.Ledger.overviewState.trendPeriod;

  /* ---- Income & Expenses this month + last month for trends ---- */
  var incomeThis = {}, incomeLast = {}, expenseThis = {}, expenseLast = {};
  window.Ledger.DB.transactions.forEach(function(t){
    var mk = window.Ledger.monthKeyOf(t.date);
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : null;
    if(!cur) return;
    if(t.type === "income"){
      if(mk === thisMonth) incomeThis[cur] = (incomeThis[cur]||0) + t.amount;
      if(mk === lastMonthKey) incomeLast[cur] = (incomeLast[cur]||0) + t.amount;
    }
    if(t.type === "expense"){
      if(mk === thisMonth) expenseThis[cur] = (expenseThis[cur]||0) + t.amount;
      if(mk === lastMonthKey) expenseLast[cur] = (expenseLast[cur]||0) + t.amount;
    }
    if(t.type === "refund"){
      if(mk === thisMonth) expenseThis[cur] = (expenseThis[cur]||0) - t.amount;
      if(mk === lastMonthKey) expenseLast[cur] = (expenseLast[cur]||0) - t.amount;
    }
  });

  var allCurSet = {};
  accs.forEach(function(a){ allCurSet[a.currency]=1; });
  Object.keys(incomeThis).forEach(function(c){ allCurSet[c]=1; });
  Object.keys(expenseThis).forEach(function(c){ allCurSet[c]=1; });
  var primaryCur = Object.keys(allCurSet)[0] || "USD";

  var incVal = incomeThis[primaryCur]||0;
  var incLast = incomeLast[primaryCur]||0;
  var expVal = expenseThis[primaryCur]||0;
  var expLast = expenseLast[primaryCur]||0;

  /* ---- Account grid ---- */
  var acctGridHtml;
  if(accs.length === 0){
    acctGridHtml = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></div><div class="big">No accounts yet</div><div class="empty-desc">Create an account to get started.</div><div class="empty-cta"><button class="btn btn-sm btn-primary" data-nav-link="accounts">Create account &rarr;</button></div></div>';
  } else {
    acctGridHtml = '<div class="acct-grid">' + accs.map(function(a){
      var bal = window.Ledger.accountBalance(a.id);
      var isCredit = a.type === "credit_card";
      var toneClass = isCredit ? "kind-credit" : "tone-sage";
      var balCls = (isCredit && bal < 0) ? " neg" : "";
      var typeAbrv = a.type === "credit_card" ? "CC" : a.type === "savings" ? "SAV" : a.type === "cash" ? "CASH" : "CHK";
      var typeLabel = a.type === "credit_card" ? "Credit Card" : a.type === "savings" ? "Savings" : a.type === "cash" ? "Cash" : "Checking";
      var drift = (a.reconciledBalance !== null && a.reconciledBalance !== undefined) ? Math.round((bal - a.reconciledBalance) * 100) / 100 : null;
      var driftHtml = (drift !== null && drift !== 0) ? '<div class="am-drift">\u26A0 ' + window.Ledger.fmtMoney(drift, a.currency) + ' off</div>' : '';
      return '<div class="acct-mini-card '+toneClass+'" data-acct-click="'+a.id+'">'
        + '<div class="am-top"><div class="am-name">'+window.Ledger.escapeHtml(a.name)+'</div><span class="am-badge '+toneClass+'">'+typeAbrv+'</span></div>'
        + '<div class="am-bal num'+balCls+'">'+window.Ledger.fmtMoney(bal, a.currency)+'</div>'
        + driftHtml
        + '<div class="am-meta">'+typeLabel+' &middot; '+a.currency+'</div>'
        + '</div>';
    }).join("") + '</div>';
  }

  /* ---- Cash flow metrics ---- */
  function trendArrow(val, last){
    if(last === 0) return val > 0 ? '<span class="trend up">new</span>' : '';
    var pct = Math.round(((val-last)/last)*100);
    if(pct === 0) return '';
    var cls = (val > last) ? "up" : "down";
    var arrow = (val > last) ? "\u2191" : "\u2193";
    return '<span class="trend '+cls+'">'+arrow+' '+Math.abs(pct)+'%</span>';
  }

  var cashFlowHtml = '<div class="grid-2">'
    + '<div class="metric income"><div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="lbl">Income this month</div><div class="val"><span class="msign">+</span>'+window.Ledger.fmtMoney(incVal, primaryCur)+'</div>'+trendArrow(incVal, incLast)+'</div>'
    + '<div class="metric expense"><div class="metric-icon"><svg viewBox="0 0 24 24"><path d="M2 12h20"/><path d="m17 8-5-5-5 5"/><rect x="6" y="14" width="12" height="6" rx="1"/></svg></div><div class="lbl">Expenses this month</div><div class="val"><span class="msign">\u2212</span>'+window.Ledger.fmtMoney(expVal, primaryCur)+'</div>'+trendArrow(expVal, expLast)+'</div>'
    + '</div>';

  /* ---- Top spending categories (mini donut) ---- */
  var catTotals = {};
  var spendTotal = 0;
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "expense" && t.type !== "refund") return;
    if(!window.Ledger.overviewMatchDate(t.date, spendPeriod)) return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(cur !== primaryCur) return;
    var sign = t.type === "refund" ? -1 : 1;
    spendTotal += t.amount * sign;
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){ catTotals[s.categoryId] = (catTotals[s.categoryId]||0) + (s.amount * sign); });
    } else if(t.category){
      catTotals[t.category] = (catTotals[t.category]||0) + (t.amount * sign);
    }
  });
  var topCats = Object.keys(catTotals).map(function(catId){
    return {catId:catId, label:window.Ledger.categoryName(catId), amt:catTotals[catId], color:window.Ledger.categoryColor(catId)};
  }).sort(function(a,b){ return b.amt - a.amt; }).slice(0,5);

  var donutHtml;
  if(topCats.length === 0){
    donutHtml = '<div class="empty-state">'
      + '<div class="empty-icon empty-icon--line"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>'
      + '</svg></div>'
      + '<div class="big">No categorized spending</div>'
      + '<div class="empty-desc">Your spending breakdown will appear here once you log expenses with categories.</div>'
      + '<div class="empty-cta"><button class="btn btn-sm" data-nav-link="transactions">Add transaction &rarr;</button></div>'
      + '</div>';
  } else {
    donutHtml = '<div class="donut-wrap">'
      + window.Ledger.svgDonut(topCats, 140, 20, "Total", window.Ledger.fmtMoneyShort(spendTotal))
      + window.Ledger.donutLegend(topCats, spendTotal)
      + '</div>';
  }

  /* ---- Spending trend (adaptive to period) ---- */
  var trendData = [];
  var now = new Date();
  if(trendPeriod === "week"){
    /* Daily bars for last 7 days */
    for(var i=6; i>=0; i--){
      var dd = new Date(now); dd.setDate(now.getDate()-i);
      var ds = dd.getFullYear()+"-"+window.Ledger.pad2(dd.getMonth()+1)+"-"+window.Ledger.pad2(dd.getDate());
      var dayLabel = dd.toLocaleDateString(undefined, {weekday:"short"});
      trendData.push({key:ds, label:dayLabel, amt:0});
    }
    window.Ledger.DB.transactions.forEach(function(t){
      if(t.type !== "expense" && t.type !== "refund") return;
      var acc = window.Ledger.findAccount(t.account);
      var cur = acc ? acc.currency : "USD";
      if(cur !== primaryCur) return;
      var m = trendData.find(function(x){ return x.key===t.date; });
      if(m) m.amt += t.amount * (t.type==="refund" ? -1 : 1);
    });
  } else if(trendPeriod === "month"){
    /* Weekly bars for current month */
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var monthEnd = new Date(now);
    var wk = 1;
    var wkStart = new Date(monthStart);
    while(wkStart <= monthEnd){
      var wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate()+6);
      if(wkEnd > monthEnd) wkEnd = monthEnd;
      var wkFrom = wkStart.getFullYear()+"-"+window.Ledger.pad2(wkStart.getMonth()+1)+"-"+window.Ledger.pad2(wkStart.getDate());
      var wkTo = wkEnd.getFullYear()+"-"+window.Ledger.pad2(wkEnd.getMonth()+1)+"-"+window.Ledger.pad2(wkEnd.getDate());
      trendData.push({key:wkFrom+"|"+wkTo, label:"Wk "+wk, amt:0, from:wkFrom, to:wkTo});
      wkStart = new Date(wkEnd); wkStart.setDate(wkStart.getDate()+1);
      wk++;
    }
    window.Ledger.DB.transactions.forEach(function(t){
      if(t.type !== "expense" && t.type !== "refund") return;
      var acc = window.Ledger.findAccount(t.account);
      var cur = acc ? acc.currency : "USD";
      if(cur !== primaryCur) return;
      var m = trendData.find(function(x){ return t.date >= x.from && t.date <= x.to; });
      if(m) m.amt += t.amount * (t.type==="refund" ? -1 : 1);
    });
  } else {
    /* Monthly bars */
    var numMonths = trendPeriod === "3months" ? 3 : trendPeriod === "6months" ? 6 : 12;
    for(var j=numMonths-1; j>=0; j--){
      var dm = new Date(now.getFullYear(), now.getMonth()-j, 1);
      var mk = dm.getFullYear()+"-"+window.Ledger.pad2(dm.getMonth()+1);
      var label = dm.toLocaleDateString(undefined, {month:"short"});
      trendData.push({key:mk, label:label, amt:0});
    }
    window.Ledger.DB.transactions.forEach(function(t){
      if(t.type !== "expense" && t.type !== "refund") return;
      var acc = window.Ledger.findAccount(t.account);
      var cur = acc ? acc.currency : "USD";
      if(cur !== primaryCur) return;
      var mk = window.Ledger.monthKeyOf(t.date);
      var m = trendData.find(function(x){ return x.key===mk; });
      if(m) m.amt += t.amount * (t.type==="refund" ? -1 : 1);
    });
  }

  var trendVals = trendData.map(function(m){ return m.amt; });
  var trendMax = Math.max.apply(null, trendVals.concat([1]));
  var hasTrendData = trendVals.some(function(v){ return v > 0; });
  var sparkW = 280, sparkH = 56, sparkPad = 4;
  var sparkHtml;
  if(!hasTrendData){
    sparkHtml = '<div class="spark-empty">'
      + '<div class="spark-empty-chart"><svg viewBox="0 0 '+sparkW+' '+sparkH+'" preserveAspectRatio="none">'
      + '<line x1="0" y1="'+(sparkH*0.25)+'" x2="'+sparkW+'" y2="'+(sparkH*0.25)+'" stroke="var(--border-soft)" stroke-width="0.5" stroke-dasharray="3 3"/>'
      + '<line x1="0" y1="'+(sparkH*0.5)+'" x2="'+sparkW+'" y2="'+(sparkH*0.5)+'" stroke="var(--border-soft)" stroke-width="0.5" stroke-dasharray="3 3"/>'
      + '<line x1="0" y1="'+(sparkH*0.75)+'" x2="'+sparkW+'" y2="'+(sparkH*0.75)+'" stroke="var(--border-soft)" stroke-width="0.5" stroke-dasharray="3 3"/>'
      + '<line x1="0" y1="'+(sparkH-1)+'" x2="'+sparkW+'" y2="'+(sparkH-1)+'" stroke="var(--border)" stroke-width="1"/>'
      + '</svg></div>'
      + '<div class="spark-empty-msg">No spending data yet</div>'
      + '<div class="spark-empty-desc">Your trend will appear after you add expenses.</div>'
      + '</div>';
  } else {
  var sparkPoints = trendVals.map(function(v, idx){
    var x = trendVals.length === 1 ? sparkW/2 : sparkPad + (idx / (trendVals.length-1)) * (sparkW - sparkPad*2);
    var y = sparkH - sparkPad - ((Math.max(v,0)/trendMax) * (sparkH - sparkPad*2));
    return x+","+y;
  }).join(" ");
  var sparkAreaPoints = sparkPoints + " " + (sparkW-sparkPad)+","+(sparkH-sparkPad) + " "+sparkPad+","+(sparkH-sparkPad);
  var sparkHtml = '<div>'
    + '<div class="sparkline-wrap" style="margin-bottom:var(--sp-2);">'
    + '<svg viewBox="0 0 '+sparkW+' '+sparkH+'" preserveAspectRatio="none">'
    + '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brass)" stop-opacity="0.4"/><stop offset="100%" stop-color="var(--brass)" stop-opacity="0"/></linearGradient></defs>'
    + '<polygon points="'+sparkAreaPoints+'" class="sparkline-area"/>'
    + '<polyline points="'+sparkPoints+'" class="sparkline-path"/>'
    + '</svg></div>'
    + '<div style="display:flex; justify-content:space-between; font-size:9.5px; font-weight:600; color:var(--text-faint); padding:0 2px;">'
    + trendData.map(function(m){ return '<span>'+m.label+'</span>'; }).join("")
    + '</div></div>';
  }

  /* ---- Pending transfers ---- */
  var pendingTfers = window.Ledger.pendingTransfers ? window.Ledger.pendingTransfers() : [];
  var pendingHtml = "";
  if(pendingTfers.length > 0){
    pendingHtml = '<div class="card section-gap">'
      + '<div class="card-header"><h2>Pending transfers</h2><span class="hint">'+pendingTfers.length+' awaiting destination</span></div>'
      + '<div class="card-pad" style="padding-top:4px; padding-bottom:4px;">'
      + pendingTfers.map(function(t){
        var acc = window.Ledger.findAccount(t.fromId);
        return '<div class="item-row">'
          + '<div class="item-row-body">'
          + '  <div style="font-size:12.5px; font-weight:700;">'+window.Ledger.escapeHtml(t.desc)+'</div>'
          + '  <div style="font-size:11px; color:var(--text-faint);">'+window.Ledger.escapeHtml(acc?acc.name:"Unknown")+' &middot; '+t.date+'</div>'
          + '</div>'
          + '<div class="item-row-ops">'
          + '  <span class="num" style="font-size:13px;">'+window.Ledger.fmtMoney(t.amount, acc?acc.currency:"USD")+'</span>'
          + '  <button class="btn btn-sm btn-primary" data-link-pending="'+t.id+'">Link</button>'
          + '</div></div>';
      }).join("")
      + '</div></div>';
  }

  /* ---- Unlinked refunds ---- */
  var unlinked = window.Ledger.unlinkedRefunds ? window.Ledger.unlinkedRefunds() : [];
  var unlinkedHtml = "";
  if(unlinked.length > 0){
    unlinkedHtml = '<div class="card section-gap">'
      + '<div class="card-header"><h2>Unlinked refunds</h2><span class="hint">'+unlinked.length+' awaiting original</span></div>'
      + '<div class="card-pad" style="padding-top:4px; padding-bottom:4px;">'
      + unlinked.map(function(t){
        var acc = window.Ledger.findAccount(t.account);
        return '<div class="item-row">'
          + '<div class="item-row-body">'
          + '  <div style="font-size:12.5px; font-weight:700;">'+window.Ledger.escapeHtml(t.desc||"Refund")+'</div>'
          + '  <div style="font-size:11px; color:var(--text-faint);">'+window.Ledger.escapeHtml(acc?acc.name:"Unknown")+' &middot; '+t.date+'</div>'
          + '</div>'
          + '<div class="item-row-ops">'
          + '  <span class="num pos" style="font-size:13px;">+'+window.Ledger.fmtMoney(t.amount, acc?acc.currency:"USD")+'</span>'
          + '  <button class="btn btn-sm" data-link-refund="'+t.id+'">Link</button>'
          + '</div></div>';
      }).join("")
      + '</div></div>';
  }

  /* ---- Upcoming recurring (next 7 days) ---- */
  var today = window.Ledger.todayISO();
  var upcoming = window.Ledger.DB.recurring.map(function(r){
    return {r:r, due:window.Ledger.nextDueDate(r, today)};
  }).filter(function(x){
    var diffDays = Math.round((new Date(x.due+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
    return diffDays <= 7;
  }).sort(function(a,b){ return a.due.localeCompare(b.due); });

  var upcomingHtml;
  if(upcoming.length === 0){
    upcomingHtml = '<div class="empty-state" style="padding:24px 20px;">'
      + '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 14h.01"/>'
      + '</svg></div>'
      + '<div class="big">All clear</div>'
      + '<div class="empty-desc">No recurring items due within 7 days. Set up scheduled transactions to automate your tracking.</div>'
      + '<div class="empty-cta"><button class="btn btn-sm" data-nav-link="scheduled">Set up recurring &rarr;</button></div>'
      + '</div>';
  } else {
    upcomingHtml = upcoming.map(function(x){
      var r = x.r;
      var acc = window.Ledger.findAccount(r.account);
      var diffDays = Math.round((new Date(x.due+"T00:00:00") - new Date(today+"T00:00:00")) / 86400000);
      var dueDisp = new Date(x.due+"T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric"});
      var whenLabel = diffDays === 0 ? "Today" : diffDays < 0 ? "Overdue" : ("in "+diffDays+"d");
      return '<div class="bill-row">'
        + '<div><div class="nm">'+window.Ledger.escapeHtml(r.name)+'</div><div class="due '+(diffDays<=3?'soon':'')+'">'+dueDisp+' &middot; '+whenLabel+' &middot; '+window.Ledger.frequencyLabel(r.frequency)+'</div></div>'
        + '<div class="num" style="font-size:13px;">'+window.Ledger.fmtMoney(r.amount, acc?acc.currency:"USD")+'</div>'
        + '</div>';
    }).join("");
  }

  /* ---- Recent activity ---- */
  var recentTx = window.Ledger.DB.transactions.slice().sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); }).slice(0,6);
  var recentHtml = recentTx.length === 0
    ? '<div class="empty-state" style="padding:36px 20px;"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg></div><div class="big">No entries yet</div><div class="empty-desc">Use "New transaction" to add your first one.</div></div>'
    : recentTx.map(window.Ledger.renderTxRow).join("");

  /* ---- Reconciliation banner ---- */
  var overdueAccts = accs.filter(function(a){ return window.Ledger.needsVerification(a); });
  var reconBannerHtml = '';
  if(overdueAccts.length > 0){
    var acctListHtml = overdueAccts.map(function(a){
      var bal = window.Ledger.accountBalance(a.id);
      return '<div class="recon-acct-row">'
        + '<span class="recon-acct-name">' + window.Ledger.escapeHtml(a.name) + ' &middot; ' + a.currency + '</span>'
        + '<span class="recon-acct-bal num">' + window.Ledger.fmtMoney(bal, a.currency) + '</span>'
        + '<button class="btn btn-sm recon-verify-btn" data-recon-acct="' + a.id + '">Verify</button>'
        + '</div>';
    }).join("");
    reconBannerHtml = ''
      + '<div class="recon-banner" id="reconBanner">'
      + '<div class="recon-banner-summary">'
      + '<span class="recon-banner-icon">\u26A0</span>'
      + '<span class="recon-banner-text"><strong>' + overdueAccts.length + ' account' + (overdueAccts.length>1?'s':'') + ' need' + (overdueAccts.length===1?'s':'') + ' verification</strong> \u2014 please check your balances against your bank statement</span>'
      + '<button class="btn btn-sm recon-toggle-btn" id="reconToggle">Review all</button>'
      + '<button class="btn btn-sm recon-dismiss-btn" id="reconDismiss">Dismiss</button>'
      + '</div>'
      + '<div class="recon-banner-details" id="reconDetails" style="display:none;">'
      + acctListHtml
      + '</div>'
      + '</div>';
  }

  /* ---- Assemble ---- */
  return reconBannerHtml
    + acctGridHtml
    + '<div class="section-gap">' + cashFlowHtml + '</div>'
    + '<div class="section-gap" style="display:flex; gap:16px; flex-wrap:wrap;">'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Top spending</h2>' + window.Ledger.periodPillHtml(spendPeriod, "spendPeriod") + '</div>'
    + '    <div class="card-pad">' + donutHtml + '</div>'
    + '  </div>'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Spending trend</h2>' + window.Ledger.periodPillHtml(trendPeriod, "trendPeriod") + '</div>'
    + '    <div class="card-pad">' + sparkHtml + '</div>'
    + '  </div>'
    + '</div>'
    + pendingHtml
    + unlinkedHtml
    + '<div class="card section-gap">'
    + '  <div class="card-header"><h2>Upcoming</h2><div class="card-header-right"><span class="hint">next 7 days</span><button class="btn btn-sm" data-nav-link="scheduled">Manage &rarr;</button></div></div>'
    + '  <div class="card-pad" style="padding-top:6px; padding-bottom:6px;">' + upcomingHtml + '</div>'
    + '</div>'
    + '<div class="card section-gap">'
    + '  <div class="card-header"><h2>Recent activity</h2><span class="hint">last 6 entries &middot; <a href="#" data-nav-link="transactions" style="color:var(--brass); font-weight:700;">View all &rarr;</a></span></div>'
    + '  <div>' + recentHtml + '</div>'
    + '</div>';
};

/* ============================================================
   RECURRING HELPERS (used by overview + recurring page)
   ============================================================ */
window.Ledger.nextDueDate = function(r, fromDate){
  fromDate = fromDate || window.Ledger.todayISO();
  var start = new Date(r.startDate + "T00:00:00");
  var from = new Date(fromDate + "T00:00:00");

  if(r.frequency === "weekly" || r.frequency === "biweekly"){
    var stepDays = r.frequency === "weekly" ? 7 : 14;
    var diffDays = Math.round((from - start) / 86400000);
    if(diffDays < 0) return window.Ledger.todayISOFromDate(start);
    var cyclesElapsed = Math.floor(diffDays / stepDays);
    var candidate = new Date(start);
    candidate.setDate(candidate.getDate() + cyclesElapsed * stepDays);
    if(candidate < from) candidate.setDate(candidate.getDate() + stepDays);
    return window.Ledger.todayISOFromDate(candidate);
  }

  var day = start.getDate();
  var candidateMonth = new Date(from.getFullYear(), from.getMonth(), Math.min(day, window.Ledger.daysInMonth(from.getFullYear(), from.getMonth())));
  if(candidateMonth < from){
    var nm = from.getMonth() + 1, ny = from.getFullYear();
    if(nm > 11){ nm = 0; ny++; }
    candidateMonth = new Date(ny, nm, Math.min(day, window.Ledger.daysInMonth(ny, nm)));
  }
  return window.Ledger.todayISOFromDate(candidateMonth);
};

window.Ledger.daysInMonth = function(year, month){ return new Date(year, month+1, 0).getDate(); };

window.Ledger.frequencyLabel = function(freq){
  if(freq === "weekly") return "Weekly";
  if(freq === "biweekly") return "Every 2 weeks";
  return "Monthly";
};
