(function(){
/* ============================================================
   DEMO DATA STATUS CHECKS
   Live validation of the currently-loaded dataset. Counts and
   checks are computed at runtime from window.Ledger.DB — they
   are never hardcoded.
   ============================================================ */
window.Ledger = window.Ledger || {};

window.Ledger.runDemoDataStatus = function(){
  var L = window.Ledger;
  var DB = L.DB || {};
  var txs = Array.isArray(DB.transactions) ? DB.transactions : [];
  var hasData = txs.length > 0;

  function count(key){ return Array.isArray(DB[key]) ? DB[key].length : 0; }

  var counts = {
    accounts: count("accounts"),
    transactions: txs.length,
    recurring: count("recurring"),
    transfers: txs.filter(function(t){ return t.type === "transfer"; }).length,
    linked: txs.filter(function(t){ return !!t.linkId; }).length,
    people: count("people"),
    debtItems: count("debtItems"),
    groups: count("groups"),
    categories: count("categories")
  };

  var checks = [];
  function addCheck(name, status, detail){
    checks.push({ name: name, status: status, detail: detail });
  }

  addCheck("Accounts present", counts.accounts > 0 ? "pass" : (hasData ? "fail" : "na"),
    counts.accounts + (counts.accounts === 1 ? " account" : " accounts"));

  addCheck("Transactions present", txs.length > 0 ? "pass" : "na", txs.length + " transactions");

  addCheck("Recurring bills loaded", counts.recurring > 0 ? "pass" : (hasData ? "fail" : "na"),
    counts.recurring + " recurring");

  var tIssues = [];
  txs.forEach(function(t){
    if(t.type !== "transfer") return;
    if(typeof t.amount !== "number" || isNaN(t.amount) || !isFinite(t.amount)){
      tIssues.push("non-numeric amount on '" + (t.desc || t.id) + "'");
      return;
    }
    if(t.fromType === "account" && !L.findAccount(t.fromId)) tIssues.push("missing from-account on '" + (t.desc || t.id) + "'");
    if(t.fromType === "person" && !L.findPerson(t.fromId)) tIssues.push("missing from-person on '" + (t.desc || t.id) + "'");
    if(t.toType === "account" && t.toId && !L.findAccount(t.toId)) tIssues.push("missing to-account on '" + (t.desc || t.id) + "'");
    if(t.toType === "person" && t.toId && !L.findPerson(t.toId)) tIssues.push("missing to-person on '" + (t.desc || t.id) + "'");
  });
  var linkGroups = {};
  txs.forEach(function(t){ if(t.linkId) (linkGroups[t.linkId] = linkGroups[t.linkId] || []).push(t); });
  Object.keys(linkGroups).forEach(function(k){
    var g = linkGroups[k];
    if(g.length !== 2) tIssues.push("linked group '" + k + "' has " + g.length + " legs (expected 2)");
    else {
      var roles = g.map(function(x){ return x.linkRole; }).sort().join(",");
      if(roles !== "in,out") tIssues.push("linked group '" + k + "' has unexpected roles (" + roles + ")");
    }
  });
  addCheck("Transfers balanced",
    hasData && counts.transfers > 0 ? (tIssues.length ? "fail" : "pass") : "na",
    tIssues.length ? tIssues.join("; ")
      : counts.transfers + " transfer rows, " + counts.linked + " linked legs — references resolve, links paired");

  var vb = { valid: false, warnings: ["validator unavailable"] };
  try { vb = L.validateBackup(DB); }
  catch(e){ vb = { valid: false, warnings: ["validateBackup threw: " + (e && e.message || e)] }; }
  addCheck("Database integrity", vb.valid ? "pass" : "fail",
    vb.warnings.length ? vb.warnings.join("; ")
      : counts.accounts + " accounts, " + counts.transactions + " transactions, " + counts.categories + " categories validated");

  var reportsOk = false, reportErr = "";
  if(L.reportState && L._reportExpenseTab && L._reportIncomeTab && L._reportTransferTab && L._reportRefundTab){
    var saved = {};
    var key;
    for(key in L.reportState){ if(L.reportState.hasOwnProperty(key)) saved[key] = L.reportState[key]; }
    try {
      L._reportExpenseTab(); L._reportIncomeTab(); L._reportTransferTab(); L._reportRefundTab();
      reportsOk = true;
    } catch(e){ reportErr = String(e && e.message || e); }
    for(key in saved){ L.reportState[key] = saved[key]; }
  }
  addCheck("Reports & charts render", reportsOk ? "pass" : (hasData ? "fail" : "na"),
    reportsOk ? "expense / income / transfer / refund tabs rendered without error"
      : (reportErr ? "render error: " + reportErr : "reports module not loaded"));

  addCheck("Budgets", "na", "no budget feature in this app");

  var passed = 0, failed = 0, na = 0;
  checks.forEach(function(c){
    if(c.status === "pass") passed++;
    else if(c.status === "fail") failed++;
    else na++;
  });

  return {
    counts: counts,
    checks: checks,
    summary: { passed: passed, failed: failed, na: na },
    overall: failed > 0 ? "fail" : (hasData ? "pass" : "na")
  };
};

window.Ledger.demoStatusHtml = function(result){
  function badge(status){
    if(status === "pass") return '<span style="color:var(--sage); font-weight:800;">&#10003; Pass</span>';
    if(status === "fail") return '<span style="color:var(--clay); font-weight:800;">&#10007; Fail</span>';
    return '<span style="color:#8892a6; font-weight:800;">&ndash; N/A</span>';
  }
  var c = result.counts;
  var countsHtml = [
    ["Accounts", c.accounts],
    ["Transactions", c.transactions],
    ["Recurring", c.recurring],
    ["Transfers", c.transfers],
    ["Linked (cross-currency)", c.linked],
    ["People", c.people],
    ["Debt items", c.debtItems],
    ["Groups", c.groups],
    ["Categories", c.categories]
  ].map(function(row){
    return '<div style="flex:1; min-width:96px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:10px 12px;">'
      + '<div style="font-size:18px; font-weight:800; line-height:1.2;">' + row[1] + '</div>'
      + '<div style="font-size:11px; opacity:.65; margin-top:2px;">' + row[0] + '</div>'
      + '</div>';
  }).join('');

  var checksHtml = result.checks.map(function(ch){
    return '<div style="display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:12.5px;">'
      + '<span>' + ch.name + '</span>'
      + '<span style="text-align:right;">' + badge(ch.status) + '<span style="opacity:.7; margin-left:8px;">' + ch.detail + '</span></span>'
      + '</div>';
  }).join('');

  var s = result.summary;
  var overall = result.overall;
  var overallColor = overall === "pass" ? "var(--sage)" : (overall === "fail" ? "var(--clay)" : "#8892a6");
  var overallLabel = overall === "pass" ? "All checks passed"
    : overall === "fail" ? s.failed + " check" + (s.failed === 1 ? "" : "s") + " failed"
    : "No data loaded yet";

  return ''
    + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">'
    + '  <div>'
    + '    <span style="font-size:13px; font-weight:800; color:' + overallColor + ';">' + overallLabel + '</span>'
    + '    <span style="font-size:11px; opacity:.6; margin-left:8px;">' + s.passed + ' passed &middot; ' + s.failed + ' failed &middot; ' + s.na + ' not applicable</span>'
    + '  </div>'
    + '  <button class="btn btn-sm" id="rerunDemoStatusBtn">Run checks again</button>'
    + '</div>'
    + '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">' + countsHtml + '</div>'
    + '<div style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.08em; opacity:.55; margin:6px 0;">Validation checks</div>'
    + '<div>' + checksHtml + '</div>'
    + '<div style="font-size:10.5px; opacity:.5; margin-top:10px;">Last checked ' + new Date().toLocaleString() + ' &middot; counts and checks are live from your data, never hardcoded.</div>';
};

window.Ledger.refreshDemoStatus = function(){
  var container = document.getElementById("demoStatusContainer");
  if(!container) return;
  container.innerHTML = window.Ledger.demoStatusHtml(window.Ledger.runDemoDataStatus());
  var btn = document.getElementById("rerunDemoStatusBtn");
  if(btn) btn.addEventListener("click", window.Ledger.refreshDemoStatus);
};

})();
