window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

/* ============================================================
   OVERVIEW PAGE
   ============================================================ */
window.Ledger.pages.renderOverviewPage = function(){
  var accs = window.Ledger.activeAccounts();
  var thisMonth = window.Ledger.monthKeyOf(window.Ledger.todayISO());
  var lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth()-1);
  var lastMonthKey = lastMonth.getFullYear()+"-"+window.Ledger.pad2(lastMonth.getMonth()+1);

  /* ---- Income & Expenses this month + last month for trends ---- */
  var incomeThis = {}, incomeLast = {}, expenseThis = {}, expenseLast = {};
  window.Ledger.DB.transactions.forEach(function(t){
    var mk = window.Ledger.monthKeyOf(t.date);
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : null;
    if(!cur) return;
    if(t.type === "income"){
      incomeThis[cur] = (incomeThis[cur]||0) + t.amount;
      if(mk === lastMonthKey) incomeLast[cur] = (incomeLast[cur]||0) + t.amount;
    }
    if(t.type === "expense"){
      expenseThis[cur] = (expenseThis[cur]||0) + t.amount;
      if(mk === lastMonthKey) expenseLast[cur] = (expenseLast[cur]||0) + t.amount;
    }
    if(t.type === "refund"){
      expenseThis[cur] = (expenseThis[cur]||0) - t.amount;
      if(mk === lastMonthKey) expenseLast[cur] = (expenseLast[cur]||0) - t.amount;
    }
  });

  /* Pick primary currency (first account's currency, or USD) */
  var allCurSet = {};
  accs.forEach(function(a){ allCurSet[a.currency]=1; });
  Object.keys(incomeThis).forEach(function(c){ allCurSet[c]=1; });
  Object.keys(expenseThis).forEach(function(c){ allCurSet[c]=1; });
  var primaryCur = Object.keys(allCurSet)[0] || "USD";

  var incVal = incomeThis[primaryCur]||0;
  var incLast = incomeLast[primaryCur]||0;
  var expVal = expenseThis[primaryCur]||0;
  var expLast = expenseLast[primaryCur]||0;
  var incTrend = incLast > 0 ? Math.round(((incVal-incLast)/incLast)*100) : (incVal > 0 ? 100 : 0);
  var expTrend = expLast > 0 ? Math.round(((expVal-expLast)/expLast)*100) : (expVal > 0 ? 100 : 0);

  /* ---- Account grid ---- */
  var acctGridHtml;
  if(accs.length === 0){
    acctGridHtml = '<div class="empty-state" style="padding:30px;"><div class="big">No accounts yet</div>Create an account to get started.</div>';
  } else {
    acctGridHtml = '<div class="acct-grid">' + accs.map(function(a){
      var bal = window.Ledger.accountBalance(a.id);
      var isCredit = a.type === "credit_card";
      var toneClass = isCredit ? "kind-credit" : "tone-sage";
      var balCls = (isCredit && bal < 0) ? " neg" : "";
      return '<div class="acct-mini-card '+toneClass+'" data-acct-click="'+a.id+'">'
        + '<div class="am-name">'+window.Ledger.escapeHtml(a.name)+'</div>'
        + '<div class="am-bal num'+balCls+'">'+window.Ledger.fmtMoney(bal, a.currency)+'</div>'
        + '<div class="am-cur">'+a.currency+'</div>'
        + '</div>';
    }).join("") + '</div>';
  }

  /* ---- Cash flow metrics (income & expenses only, no net) ---- */
  function trendArrow(val, last){
    if(last === 0) return val > 0 ? '<span class="trend up">new</span>' : '';
    var pct = Math.round(((val-last)/last)*100);
    if(pct === 0) return '';
    var cls = (val > last) ? "up" : "down";
    var arrow = (val > last) ? "\u2191" : "\u2193";
    return '<span class="trend '+cls+'">'+arrow+' '+Math.abs(pct)+'%</span>';
  }

  var cashFlowHtml = '<div class="grid-2">'
    + '<div class="metric income"><div class="lbl">Income this month</div><div class="val">+'+window.Ledger.fmtMoney(incVal, primaryCur)+'</div>'+trendArrow(incVal, incLast)+'</div>'
    + '<div class="metric expense"><div class="lbl">Expenses this month</div><div class="val">\u2212'+window.Ledger.fmtMoney(expVal, primaryCur)+'</div>'+trendArrow(expVal, expLast)+'</div>'
    + '</div>';

  /* ---- Top spending categories (mini donut) ---- */
  var catTotals = {};
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "expense" && t.type !== "refund") return;
    if(window.Ledger.monthKeyOf(t.date) !== thisMonth) return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(cur !== primaryCur) return;
    var sign = t.type === "refund" ? -1 : 1;
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){ catTotals[s.categoryId] = (catTotals[s.categoryId]||0) + (s.amount * sign); });
    } else if(t.category){
      catTotals[t.category] = (catTotals[t.category]||0) + (t.amount * sign);
    }
  });
  var topCats = Object.keys(catTotals).map(function(catId){
    return {catId:catId, label:window.Ledger.categoryName(catId), amt:catTotals[catId], color:window.Ledger.categoryColor(catId)};
  }).sort(function(a,b){ return b.amt - a.amt; }).slice(0,5);
  var totalExpense = topCats.reduce(function(s,c){ return s+Math.abs(c.amt); },0);

  var donutHtml;
  if(topCats.length === 0){
    donutHtml = '<div class="empty-state" style="padding:30px;"><div class="big">No categorized spending</div>Expenses this month will appear here.</div>';
  } else {
    donutHtml = '<div class="donut-wrap">'
      + window.Ledger.svgDonut(topCats, 140, 20, "Total", window.Ledger.fmtMoneyShort(totalExpense))
      + window.Ledger.donutLegend(topCats, totalExpense)
      + '</div>';
  }

  /* ---- 6-month spending sparkline ---- */
  var now = new Date();
  var sparkMonths = [];
  for(var i=5; i>=0; i--){
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var mk = d.getFullYear()+"-"+window.Ledger.pad2(d.getMonth()+1);
    var label = d.toLocaleDateString(undefined, {month:"short"});
    sparkMonths.push({mk:mk, label:label, amt:0});
  }
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "expense" && t.type !== "refund") return;
    var acc = window.Ledger.findAccount(t.account);
    var cur = acc ? acc.currency : "USD";
    if(cur !== primaryCur) return;
    var mk = window.Ledger.monthKeyOf(t.date);
    var m = sparkMonths.find(function(x){ return x.mk===mk; });
    if(m) m.amt += t.amount * (t.type==="refund" ? -1 : 1);
  });
  var sparkVals = sparkMonths.map(function(m){ return m.amt; });
  var sparkMax = Math.max.apply(null, sparkVals.concat([1]));
  var sparkW = 240, sparkH = 50, sparkPad = 4;
  var sparkPoints = sparkVals.map(function(v, idx){
    var x = sparkPad + (idx / (sparkVals.length-1)) * (sparkW - sparkPad*2);
    var y = sparkH - sparkPad - ((Math.max(v,0)/sparkMax) * (sparkH - sparkPad*2));
    return x+","+y;
  }).join(" ");
  var sparkAreaPoints = sparkPoints + " " + (sparkW-sparkPad)+","+(sparkH-sparkPad) + " "+sparkPad+","+(sparkH-sparkPad);
  var sparkHtml = '<div style="display:flex; align-items:center; gap:var(--sp-4); flex-wrap:wrap;">'
    + '<div class="sparkline-wrap" style="flex:1; min-width:180px;">'
    + '<svg viewBox="0 0 '+sparkW+' '+sparkH+'" preserveAspectRatio="none">'
    + '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brass)" stop-opacity="0.4"/><stop offset="100%" stop-color="var(--brass)" stop-opacity="0"/></linearGradient></defs>'
    + '<polygon points="'+sparkAreaPoints+'" class="sparkline-area"/>'
    + '<polyline points="'+sparkPoints+'" class="sparkline-path"/>'
    + '</svg></div>'
    + '<div style="display:flex; gap:var(--sp-3); font-size:10px; font-weight:600; color:var(--text-faint);">'
    + sparkMonths.map(function(m){ return '<span>'+m.label+'</span>'; }).join("")
    + '</div></div>';

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
    upcomingHtml = '<div class="empty-state" style="padding:24px;"><div class="big" style="font-size:14px;">Nothing due soon</div>Recurring items due within 7 days will appear here.</div>';
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
    ? '<div class="empty-state"><div class="big">No entries yet</div>Use "New transaction" to add your first one.</div>'
    : recentTx.map(window.Ledger.renderTxRow).join("");

  /* ---- Assemble ---- */
  return ''
    + acctGridHtml
    + '<div class="section-gap">' + cashFlowHtml + '</div>'
    + '<div class="section-gap" style="display:flex; gap:16px; flex-wrap:wrap;">'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Top spending</h2><span class="hint">this month</span></div>'
    + '    <div class="card-pad">' + donutHtml + '</div>'
    + '  </div>'
    + '  <div class="card" style="flex:1; min-width:280px;">'
    + '    <div class="card-header"><h2>Spending trend</h2><span class="hint">6 months</span></div>'
    + '    <div class="card-pad">' + sparkHtml + '</div>'
    + '  </div>'
    + '</div>'
    + pendingHtml
    + unlinkedHtml
    + '<div class="card section-gap">'
    + '  <div class="card-header"><h2>Upcoming</h2><span class="hint">next 7 days</span></div>'
    + '  <div class="card-pad" style="padding-top:6px; padding-bottom:6px;">' + upcomingHtml + '</div>'
    + '  <div style="padding:0 20px 16px;"><button class="btn btn-sm" data-nav-link="scheduled">Manage scheduled &rarr;</button></div>'
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
