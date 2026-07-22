window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

/* ============================================================
   REPORT STATE
   ============================================================ */
window.Ledger.reportState = {
  tab: "expense",
  datePreset: "month",
  dateFrom: "",
  dateTo: "",
  account: "all",
  currency: "all",
  category: "all",
  subcategory: "all",
  type: "all",
  search: ""
};

/* ============================================================
   FILTER HELPERS
   ============================================================ */
window.Ledger.reportMatchesDate = function(dateStr){
  var f = window.Ledger.reportState;
  if(f.datePreset === "all") return true;
  var d = new Date(dateStr + "T00:00:00");
  var now = new Date();
  if(f.datePreset === "today") return dateStr === window.Ledger.todayISO();
  if(f.datePreset === "week"){
    var weekAgo = new Date(now); weekAgo.setDate(now.getDate()-7);
    return d >= weekAgo && d <= now;
  }
  if(f.datePreset === "3months"){
    var threeMo = new Date(now); threeMo.setMonth(now.getMonth()-3);
    return d >= threeMo && d <= now;
  }
  if(f.datePreset === "6months"){
    var sixMo = new Date(now); sixMo.setMonth(now.getMonth()-6);
    return d >= sixMo && d <= now;
  }
  if(f.datePreset === "year") return d.getFullYear() === now.getFullYear();
  if(f.datePreset === "lastyear") return d.getFullYear() === now.getFullYear()-1;
  if(f.datePreset === "custom"){
    if(f.dateFrom && dateStr < f.dateFrom) return false;
    if(f.dateTo && dateStr > f.dateTo) return false;
    return true;
  }
  return true;
};

window.Ledger.reportFilterTx = function(types){
  var f = window.Ledger.reportState;
  return window.Ledger.DB.transactions.filter(function(t){
    if(types.indexOf(t.type) === -1) return false;
    if(t.linkId) return false;
    if(f.type !== "all" && t.type !== f.type) return false;
    if(!window.Ledger.reportMatchesDate(t.date)) return false;
    if(f.account !== "all"){
      var touches = (t.account === f.account) ||
        (t.fromType==="account" && t.fromId===f.account) ||
        (t.toType==="account" && t.toId===f.account);
      if(!touches) return false;
    }
    if(f.currency !== "all"){
      var cur = null;
      if(t.account){ var a = window.Ledger.findAccount(t.account); cur = a ? a.currency : null; }
      else if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); cur=a2?a2.currency:null; }
      else if(t.toType==="account"){ var a3=window.Ledger.findAccount(t.toId); cur=a3?a3.currency:null; }
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
    if(f.search && f.search.trim()){
      var q = f.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

window.Ledger.reportGetCur = function(t){
  if(t.account){ var a=window.Ledger.findAccount(t.account); return a?a.currency:"USD"; }
  if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); return a2?a2.currency:"USD"; }
  if(t.toType==="account"){ var a3=window.Ledger.findAccount(t.toId); return a3?a3.currency:"USD"; }
  return "USD";
};

/* ============================================================
   SVG CHART GENERATORS
   ============================================================ */

/* Donut chart — returns SVG string. data = [{label, amt, color}] */
window.Ledger.svgDonut = function(data, size, thickness, centerLabel, centerValue){
  size = size || 160; thickness = thickness || 24;
  var total = data.reduce(function(s,d){ return s+Math.abs(d.amt); }, 0);
  if(total === 0) return '<div style="width:'+size+'px;height:'+size+'px;"></div>';
  var r = (size - thickness) / 2;
  var cx = size/2, cy = size/2;
  var circ = 2 * Math.PI * r;
  var offset = 0;
  var arcs = data.map(function(d){
    var pct = Math.abs(d.amt) / total;
    var dash = pct * circ;
    var gap = circ - dash;
    var html = '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+d.color+'" stroke-width="'+thickness+'"'
      + ' stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="'+(-offset)+'"'
      + ' style="transition:stroke-dasharray 0.5s ease-out, stroke-dashoffset 0.5s ease-out;" />';
    offset += dash;
    return html;
  }).join("");

  var centerHtml = "";
  if(centerLabel || centerValue){
    var labelY = centerLabel ? cy - 6 : cy + 4;
    centerHtml = (centerLabel ? '<text x="'+cx+'" y="'+labelY+'" text-anchor="middle" class="donut-center" fill="var(--text-faint)" font-size="10" font-weight="700">'+centerLabel+'</text>' : '')
      + '<text x="'+cx+'" y="'+(labelY+16)+'" text-anchor="middle" class="donut-center" fill="var(--text)" font-size="15" font-weight="800">'+window.Ledger.escapeHtml(centerValue)+'</text>';
  }

  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'
    + arcs + centerHtml + '</svg>';
};

/* Legend for donut — returns HTML string */
window.Ledger.donutLegend = function(data, total){
  return '<div class="donut-legend">' + data.map(function(d){
    var pct = total > 0 ? Math.round((Math.abs(d.amt)/total)*100) : 0;
    return '<div class="donut-legend-item">'
      + '<span class="donut-legend-dot" style="background:'+d.color+';"></span>'
      + '<span class="truncate">'+window.Ledger.escapeHtml(d.label)+'</span>'
      + '<span class="donut-legend-pct">'+pct+'%</span>'
      + '</div>';
  }).join("") + '</div>';
};

/* Monthly bar chart — returns HTML. months = [{label, amt, color}] */
window.Ledger.htmlBarChart = function(months, color){
  color = color || "var(--clay)";
  if(months.length === 0) return '';
  var max = Math.max.apply(null, months.map(function(m){ return Math.abs(m.amt); }));
  if(max === 0) return '';
  return '<div class="bar-chart">' + months.map(function(m){
    var h = max > 0 ? Math.round((Math.abs(m.amt)/max)*100) : 0;
    h = Math.max(h, 3);
    return '<div class="bar-col">'
      + '<div class="bar-value">'+window.Ledger.fmtMoneyShort(m.amt)+'</div>'
      + '<div class="bar-rect" style="height:'+h+'%; background:'+color+';"></div>'
      + '<div class="bar-label">'+m.label+'</div>'
      + '</div>';
  }).join("") + '</div>';
};

/* Diverging bar chart (net flow) — returns HTML. rows = [{label, amt}] */
window.Ledger.htmlDivChart = function(rows){
  if(rows.length === 0) return '<div class="empty-state" style="padding:30px;"><div class="big">No transfers in range</div></div>';
  var maxAbs = Math.max.apply(null, rows.map(function(r){ return Math.abs(r.amt); }));
  if(maxAbs === 0) maxAbs = 1;
  return '<div class="div-chart">' + rows.map(function(r){
    var pct = Math.round((Math.abs(r.amt)/maxAbs)*50);
    pct = Math.max(pct, 2);
    var isPos = r.amt >= 0;
    var cls = isPos ? "positive" : "negative";
    var amtCls = isPos ? "pos" : "neg";
    var sign = isPos ? "+" : "";
    return '<div class="div-row">'
      + '<div class="div-label" title="'+window.Ledger.escapeHtml(r.label)+'">'+window.Ledger.escapeHtml(r.label)+'</div>'
      + '<div class="div-track"><div class="div-track-center"></div><div class="div-bar '+cls+'" style="width:'+pct+'%;"></div></div>'
      + '<div class="div-amount '+amtCls+' num">'+sign+window.Ledger.fmtMoney(r.amt, r.cur)+'</div>'
      + '</div>';
  }).join("") + '</div>';
};

/* ============================================================
   MONTHLY TREND HELPER
   ============================================================ */
window.Ledger.getMonthlyTrend = function(txList, numMonths){
  numMonths = numMonths || 6;
  var now = new Date();
  var months = [];
  for(var i=numMonths-1; i>=0; i--){
    var d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    var mk = d.getFullYear()+"-"+window.Ledger.pad2(d.getMonth()+1);
    var label = d.toLocaleDateString(undefined, {month:"short"});
    months.push({mk:mk, label:label, amt:0});
  }
  txList.forEach(function(t){
    var mk = window.Ledger.monthKeyOf(t.date);
    var m = months.find(function(x){ return x.mk===mk; });
    if(m) m.amt += Math.abs(t.amount);
  });
  return months;
};

/* ============================================================
   REPORT TABS: EXPENSES
   ============================================================ */
window.Ledger._reportExpenseTab = function(){
  var txList = window.Ledger.reportFilterTx(["expense","refund"]);
  var byCur = {};
  txList.forEach(function(t){
    var cur = window.Ledger.reportGetCur(t);
    var sign = t.type === "refund" ? -1 : 1;
    if(!byCur[cur]) byCur[cur] = {total:0, byCat:{}};
    byCur[cur].total += t.amount * sign;
    var catId = "";
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){
        if(!byCur[cur].byCat[s.categoryId]) byCur[cur].byCat[s.categoryId] = 0;
        byCur[cur].byCat[s.categoryId] += s.amount * sign;
      });
    } else if(t.category){
      if(!byCur[cur].byCat[t.category]) byCur[cur].byCat[t.category] = 0;
      byCur[cur].byCat[t.category] += t.amount * sign;
    }
  });

  var html = "";
  Object.keys(byCur).forEach(function(cur){
    var data = byCur[cur];
    var catEntries = Object.keys(data.byCat).map(function(catId){
      return {catId:catId, label:window.Ledger.categoryName(catId), amt:data.byCat[catId], color:window.Ledger.categoryColor(catId)};
    }).sort(function(a,b){ return b.amt - a.amt; });

    var txCount = txList.filter(function(t){ return window.Ledger.reportGetCur(t)===cur; }).length;
    var topCat = catEntries.length > 0 ? catEntries[0].label : "—";

    html += '<div class="section-gap">';
    html += '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); margin-bottom:12px;">'+window.Ledger.escapeHtml(cur)+'</div>';
    html += '<div class="grid-3" style="margin-bottom:var(--sp-5);">';
    html += '<div class="metric expense"><div class="lbl">Total spent</div><div class="val">−'+window.Ledger.fmtMoney(data.total, cur)+'</div></div>';
    html += '<div class="metric"><div class="lbl">Transactions</div><div class="val">'+txCount+'</div></div>';
    html += '<div class="metric"><div class="lbl">Top category</div><div class="val" style="font-size:16px;">'+window.Ledger.escapeHtml(topCat)+'</div></div>';
    html += '</div>';

    if(catEntries.length > 0){
      html += '<div class="card"><div class="card-pad"><div class="donut-wrap">';
      html += window.Ledger.svgDonut(catEntries, 160, 24, "Total", window.Ledger.fmtMoneyShort(data.total));
      html += window.Ledger.donutLegend(catEntries, data.total);
      html += '</div></div></div>';
    }
    html += '</div>';
  });

  if(Object.keys(byCur).length === 0){
    html = '<div class="empty-state"><div class="big">No expenses in this range</div>Try adjusting your filters.</div>';
  }

  /* Monthly trend */
  var trendMonths = window.Ledger.getMonthlyTrend(txList, 6);
  var hasTrend = trendMonths.some(function(m){ return m.amt > 0; });
  if(hasTrend){
    html += '<div class="card section-gap"><div class="card-header"><h2>Monthly trend</h2><span class="hint">last 6 months</span></div><div class="card-pad">';
    html += window.Ledger.htmlBarChart(trendMonths, "var(--clay)");
    html += '</div></div>';
  }

  return html;
};

/* ============================================================
   REPORT TABS: INCOME
   ============================================================ */
window.Ledger._reportIncomeTab = function(){
  var txList = window.Ledger.reportFilterTx(["income"]);
  var byCur = {};
  txList.forEach(function(t){
    var cur = window.Ledger.reportGetCur(t);
    if(!byCur[cur]) byCur[cur] = {total:0, byCat:{}};
    byCur[cur].total += t.amount;
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){
        if(!byCur[cur].byCat[s.categoryId]) byCur[cur].byCat[s.categoryId] = 0;
        byCur[cur].byCat[s.categoryId] += s.amount;
      });
    } else {
      var catId = t.category || "";
      if(catId){
        if(!byCur[cur].byCat[catId]) byCur[cur].byCat[catId] = 0;
        byCur[cur].byCat[catId] += t.amount;
      }
    }
  });

  var html = "";
  Object.keys(byCur).forEach(function(cur){
    var data = byCur[cur];
    var catEntries = Object.keys(data.byCat).map(function(catId){
      return {catId:catId, label:window.Ledger.categoryName(catId), amt:data.byCat[catId], color:window.Ledger.categoryColor(catId)};
    }).sort(function(a,b){ return b.amt - a.amt; });

    var txCount = txList.filter(function(t){ return window.Ledger.reportGetCur(t)===cur; }).length;
    var topCat = catEntries.length > 0 ? catEntries[0].label : "—";

    html += '<div class="section-gap">';
    html += '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); margin-bottom:12px;">'+window.Ledger.escapeHtml(cur)+'</div>';
    html += '<div class="grid-3" style="margin-bottom:var(--sp-5);">';
    html += '<div class="metric income"><div class="lbl">Total received</div><div class="val">+'+window.Ledger.fmtMoney(data.total, cur)+'</div></div>';
    html += '<div class="metric"><div class="lbl">Transactions</div><div class="val">'+txCount+'</div></div>';
    html += '<div class="metric"><div class="lbl">Top source</div><div class="val" style="font-size:16px;">'+window.Ledger.escapeHtml(topCat)+'</div></div>';
    html += '</div>';

    if(catEntries.length > 0){
      html += '<div class="card"><div class="card-pad"><div class="donut-wrap">';
      html += window.Ledger.svgDonut(catEntries, 160, 24, "Total", window.Ledger.fmtMoneyShort(data.total));
      html += window.Ledger.donutLegend(catEntries, data.total);
      html += '</div></div></div>';
    }
    html += '</div>';
  });

  if(Object.keys(byCur).length === 0){
    html = '<div class="empty-state"><div class="big">No income in this range</div>Try adjusting your filters.</div>';
  }

  var trendMonths = window.Ledger.getMonthlyTrend(txList, 6);
  var hasTrend = trendMonths.some(function(m){ return m.amt > 0; });
  if(hasTrend){
    html += '<div class="card section-gap"><div class="card-header"><h2>Monthly trend</h2><span class="hint">last 6 months</span></div><div class="card-pad">';
    html += window.Ledger.htmlBarChart(trendMonths, "var(--sage)");
    html += '</div></div>';
  }

  return html;
};

/* ============================================================
   REPORT TABS: TRANSFERS (net flow)
   ============================================================ */
window.Ledger._reportTransferTab = function(){
  var txList = window.Ledger.reportFilterTx(["transfer"]);
  var pending = txList.filter(function(t){ return t.pending; });
  var completed = txList.filter(function(t){ return !t.pending; });

  /* Net flow per account */
  var flowMap = {};
  txList.forEach(function(t){
    if(t.fromType==="account" && t.fromId){
      var a = window.Ledger.findAccount(t.fromId);
      var cur = a ? a.currency : "USD";
      var key = t.fromId;
      if(!flowMap[key]) flowMap[key] = {name:a?a.name:"Unknown", cur:cur, amt:0};
      flowMap[key].amt -= t.amount;
    }
    if(t.toType==="account" && t.toId){
      var a2 = window.Ledger.findAccount(t.toId);
      var cur2 = a2 ? a2.currency : "USD";
      var key2 = t.toId;
      if(!flowMap[key2]) flowMap[key2] = {name:a2?a2.name:"Unknown", cur:cur2, amt:0};
      flowMap[key2].amt += t.amount;
    }
  });

  var flowRows = Object.keys(flowMap).map(function(k){
    return {label:flowMap[k].name, amt:flowMap[k].amt, cur:flowMap[k].cur};
  }).sort(function(a,b){ return a.amt - b.amt; });

  /* Category breakdown */
  var byCat = {};
  txList.forEach(function(t){
    if(t.categorySplits && t.categorySplits.length){
      t.categorySplits.forEach(function(s){
        if(!byCat[s.categoryId]) byCat[s.categoryId] = 0;
        byCat[s.categoryId] += s.amount;
      });
    } else if(t.category){
      if(!byCat[t.category]) byCat[t.category] = 0;
      byCat[t.category] += t.amount;
    }
  });

  /* Aggregate totals per currency (from each account's currency) */
  var byCur = {};
  txList.forEach(function(t){
    var fromRef = t.fromType==="account" ? window.Ledger.findAccount(t.fromId) : null;
    var cur = fromRef ? fromRef.currency : "USD";
    if(!byCur[cur]) byCur[cur] = {total:0, pendingTotal:0, count:0, pendingCount:0};
    byCur[cur].total += t.amount;
    byCur[cur].count++;
    if(t.pending){ byCur[cur].pendingTotal += t.amount; byCur[cur].pendingCount++; }
  });

  var html = '';
  Object.keys(byCur).forEach(function(cur){
    var d = byCur[cur];
    html += '<div class="section-gap">';
    html += '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); margin-bottom:12px;">'+window.Ledger.escapeHtml(cur)+'</div>';
    html += '<div class="grid-3" style="margin-bottom:var(--sp-5);">';
    html += '<div class="metric"><div class="lbl">Total moved</div><div class="val">'+window.Ledger.fmtMoney(d.total, cur)+'</div></div>';
    html += '<div class="metric"><div class="lbl">Transactions</div><div class="val">'+d.count+'</div></div>';
    html += '<div class="metric"><div class="lbl">Pending</div><div class="val">'+d.pendingCount+' ('+window.Ledger.fmtMoney(d.pendingTotal, cur)+')</div></div>';
    html += '</div>';
    html += '</div>';
  });

  html += '<div class="card" style="margin-bottom:var(--sp-5);"><div class="card-header"><h2>Net flow per account</h2><span class="hint">positive = money received</span></div><div class="card-pad">';
  html += window.Ledger.htmlDivChart(flowRows);
  html += '</div></div>';

  /* Category breakdown donut */
  var catEntries = Object.keys(byCat).map(function(catId){
    return {catId:catId, label:window.Ledger.categoryName(catId), amt:byCat[catId], color:window.Ledger.categoryColor(catId)};
  }).sort(function(a,b){ return b.amt - a.amt; });

  if(catEntries.length > 0){
    var catTotal = catEntries.reduce(function(s,e){ return s+e.amt; }, 0);
    html += '<div class="card section-gap"><div class="card-header"><h2>Transfers by category</h2></div><div class="card-pad"><div class="donut-wrap">';
    html += window.Ledger.svgDonut(catEntries, 160, 24, "Total", window.Ledger.fmtMoneyShort(catTotal));
    html += window.Ledger.donutLegend(catEntries, catTotal);
    html += '</div></div></div>';
  }

  /* Pending vs completed donut */
  if(txList.length > 0){
    var donutData = [
      {label:"Completed", amt:completed.length, color:"var(--sage)"},
      {label:"Pending", amt:pending.length, color:"var(--brass)"}
    ].filter(function(d){ return d.amt > 0; });
    html += '<div class="card section-gap"><div class="card-header"><h2>Pending vs Completed</h2></div><div class="card-pad"><div class="donut-wrap">';
    html += window.Ledger.svgDonut(donutData, 130, 20, "Total", txList.length+"");
    html += window.Ledger.donutLegend(donutData, txList.length);
    html += '</div></div></div>';
  }

  if(txList.length === 0){
    html = '<div class="empty-state"><div class="big">No transfers in this range</div>Try adjusting your filters.</div>';
  }

  return html;
};

/* ============================================================
   REPORT TABS: REFUNDS
   ============================================================ */
window.Ledger._reportRefundTab = function(){
  var txList = window.Ledger.reportFilterTx(["refund"]);
  var byCur = {};
  txList.forEach(function(t){
    var cur = window.Ledger.reportGetCur(t);
    if(!byCur[cur]) byCur[cur] = {total:0, byCat:{}, linked:0, unlinked:0};
    byCur[cur].total += t.amount;
    if(t.refundOf) byCur[cur].linked++; else byCur[cur].unlinked++;
    var catId = t.category || "";
    if(catId){
      if(!byCur[cur].byCat[catId]) byCur[cur].byCat[catId] = 0;
      byCur[cur].byCat[catId] += t.amount;
    }
  });

  var html = "";
  Object.keys(byCur).forEach(function(cur){
    var data = byCur[cur];
    var catEntries = Object.keys(data.byCat).map(function(catId){
      return {catId:catId, label:window.Ledger.categoryName(catId), amt:data.byCat[catId], color:window.Ledger.categoryColor(catId)};
    }).sort(function(a,b){ return b.amt - a.amt; });

    var avg = txList.filter(function(t){ return window.Ledger.reportGetCur(t)===cur; }).length > 0
      ? data.total / txList.filter(function(t){ return window.Ledger.reportGetCur(t)===cur; }).length : 0;

    html += '<div class="section-gap">';
    html += '<div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); margin-bottom:12px;">'+window.Ledger.escapeHtml(cur)+'</div>';
    html += '<div class="grid-3" style="margin-bottom:var(--sp-5);">';
    html += '<div class="metric income"><div class="lbl">Total refunded</div><div class="val">+'+window.Ledger.fmtMoney(data.total, cur)+'</div></div>';
    html += '<div class="metric"><div class="lbl">Refunds</div><div class="val">'+(data.linked+data.unlinked)+'</div></div>';
    html += '<div class="metric"><div class="lbl">Avg refund</div><div class="val">'+window.Ledger.fmtMoney(avg, cur)+'</div></div>';
    html += '</div>';

    if(catEntries.length > 0){
      html += '<div class="card"><div class="card-header"><h2>Refunds by category</h2></div><div class="card-pad"><div class="donut-wrap">';
      html += window.Ledger.svgDonut(catEntries, 160, 24, "Total", window.Ledger.fmtMoneyShort(data.total));
      html += window.Ledger.donutLegend(catEntries, data.total);
      html += '</div></div></div>';
    }

    if(data.linked + data.unlinked > 0){
      var linkData = [
        {label:"Linked", amt:data.linked, color:"var(--sage)"},
        {label:"Unlinked", amt:data.unlinked, color:"var(--clay)"}
      ].filter(function(d){ return d.amt > 0; });
      html += '<div class="card section-gap"><div class="card-header"><h2>Linked vs Unlinked</h2></div><div class="card-pad"><div class="donut-wrap">';
      html += window.Ledger.svgDonut(linkData, 130, 20, "Total", (data.linked+data.unlinked)+"");
      html += window.Ledger.donutLegend(linkData, data.linked+data.unlinked);
      html += '</div></div></div>';
    }
    html += '</div>';
  });

  if(Object.keys(byCur).length === 0){
    html = '<div class="empty-state"><div class="big">No refunds in this range</div>Try adjusting your filters.</div>';
  }

  var trendMonths = window.Ledger.getMonthlyTrend(txList, 6);
  var hasTrend = trendMonths.some(function(m){ return m.amt > 0; });
  if(hasTrend){
    html += '<div class="card section-gap"><div class="card-header"><h2>Monthly trend</h2><span class="hint">last 6 months</span></div><div class="card-pad">';
    html += window.Ledger.htmlBarChart(trendMonths, "var(--sage)");
    html += '</div></div>';
  }

  return html;
};

/* ============================================================
   MAIN RENDER
   ============================================================ */
window.Ledger.pages.renderReportsPage = function(){
  var f = window.Ledger.reportState;

  /* Date presets */
  var datePresets = [
    {id:"month", label:"This month"},
    {id:"3months", label:"Last 3 months"},
    {id:"6months", label:"Last 6 months"},
    {id:"year", label:"This year"},
    {id:"lastyear", label:"Last year"},
    {id:"all", label:"All time"},
    {id:"custom", label:"Custom range"}
  ];
  var dateOpts = datePresets.map(function(p){
    return '<option value="'+p.id+'" '+(f.datePreset===p.id?"selected":"")+'>'+p.label+'</option>';
  }).join("");

  /* Type filter */
  var typeOpts = '<option value="all" '+(f.type==="all"?"selected":"")+'>All types</option>'
    + '<option value="expense" '+(f.type==="expense"?"selected":"")+'>Expense</option>'
    + '<option value="income" '+(f.type==="income"?"selected":"")+'>Income</option>'
    + '<option value="transfer" '+(f.type==="transfer"?"selected":"")+'>Transfer</option>'
    + '<option value="refund" '+(f.type==="refund"?"selected":"")+'>Refund</option>';

  /* Account filter */
  var accOpts = '<option value="all">All accounts</option>' + window.Ledger.DB.accounts.filter(function(a){ return !a.archived; }).map(function(a){
    return '<option value="'+a.id+'" '+(f.account===a.id?"selected":"")+'>'+window.Ledger.escapeHtml(a.name)+' ('+a.currency+')</option>';
  }).join("");

  /* Currency filter */
  var curSet = {}; window.Ledger.DB.accounts.forEach(function(a){ if(!a.archived) curSet[a.currency]=1; });
  var curOpts = '<option value="all">All currencies</option>' + Object.keys(curSet).map(function(c){
    return '<option value="'+c+'" '+(f.currency===c?"selected":"")+'>'+c+'</option>';
  }).join("");

  /* Category filter — type-aware */
  var filteredCats = window.Ledger.getCategoriesForType(f.type);
  var catOpts = '<option value="all">All categories</option>' + filteredCats.map(function(c){
    return '<option value="'+c.id+'" '+(f.category===c.id?"selected":"")+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
  }).join("");

  /* Subcategory filter — type + category aware */
  var filteredSubs = window.Ledger.getSubsForFilter(f.type, f.category);
  var subOpts = '<option value="all">All subcategories</option>' + filteredSubs.map(function(s){
    return '<option value="'+s.id+'" '+(f.subcategory===s.id?"selected":"")+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
  }).join("");

  /* Active filter detection */
  var hasActiveFilters = (f.account!=="all" || f.currency!=="all" || f.category!=="all" || f.subcategory!=="all" || f.type!=="all" || f.datePreset!=="month" || f.search.trim()!=="");
  var clearBtnHtml = hasActiveFilters
    ? '<button class="clear-filters" id="rClearFiltersBtn">Clear filters</button>'
    : '';
  function filteredCls(val){ return val !== "all" ? ' is-filtered' : ''; }

  /* Tab content */
  var tabContent = "";
  if(f.tab === "expense") tabContent = window.Ledger._reportExpenseTab();
  else if(f.tab === "income") tabContent = window.Ledger._reportIncomeTab();
  else if(f.tab === "transfer") tabContent = window.Ledger._reportTransferTab();
  else if(f.tab === "refund") tabContent = window.Ledger._reportRefundTab();

  return ''
    + '<div class="card">'
    + '  <div class="filters-bar">'
    + '    <select id="rDatePreset" class="'+filteredCls(f.datePreset)+'">'+dateOpts+'</select>'
    + '    <select id="rType" class="'+filteredCls(f.type)+'">'+typeOpts+'</select>'
    + '    <select id="rAccount" class="'+filteredCls(f.account)+'">'+accOpts+'</select>'
    + '    <select id="rCurrency" class="'+filteredCls(f.currency)+'">'+curOpts+'</select>'
    + '    <select id="rCategory" class="'+filteredCls(f.category)+'">'+catOpts+'</select>'
    + '    <select id="rSubcategory" class="'+filteredCls(f.subcategory)+'">'+subOpts+'</select>'
    + '    <input type="text" id="rSearch" placeholder="Search descriptions..." value="'+window.Ledger.escapeHtml(f.search)+'" style="background:var(--surface-2); border:1px solid var(--border); border-radius:var(--radius-md); padding:8px 12px; font-size:12px; font-weight:500; color:var(--text); min-width:140px;">'
    + clearBtnHtml
    + '    <button class="btn btn-sm" id="exportReportCsv" style="margin-left:auto;">Export CSV</button>'
    + '  </div>'
    + '</div>'

    + (function(){
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
          return '<div class="card section-gap"><div class="card-pad"><div class="upcoming-banner">'
            + '<span class="upcoming-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg></span>'
            + '<span>' + upcomingCount + ' upcoming scheduled transaction' + (upcomingCount !== 1 ? 's' : '') + ' not included in these totals</span>'
            + '<a href="#" class="upcoming-link" data-nav-link="scheduled">View</a>'
            + '</div></div></div>';
        }
      }
      return '';
    })()

    + '<div class="card section-gap">'
    + '  <div class="card-pad" style="padding-bottom:8px;">'
    + '    <div class="report-tabs" id="reportTabs">'
    + '      <button data-rtab="expense" class="'+(f.tab==="expense"?"active":"")+'">Expenses</button>'
    + '      <button data-rtab="income" class="'+(f.tab==="income"?"active":"")+'">Income</button>'
    + '      <button data-rtab="transfer" class="'+(f.tab==="transfer"?"active":"")+'">Transfers</button>'
    + '      <button data-rtab="refund" class="'+(f.tab==="refund"?"active":"")+'">Refunds</button>'
    + '    </div>'
    + '  </div>'
    + '  <div class="card-pad" style="padding-top:0;">' + tabContent + '</div>'
    + '</div>';
};
