window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderCreditCardsPage = function(){
  var DB = window.Ledger.DB;
  var accountBalance = window.Ledger.accountBalance;
  var fmtMoney = window.Ledger.fmtMoney;
  var escapeHtml = window.Ledger.escapeHtml;

  var cards = DB.accounts.filter(function(a){ return a.type === "credit_card"; });

  if(cards.length === 0){
    return '<div class="card card-pad">'
      + '<div class="empty-state"><div class="big">No credit cards</div>Add a credit card account to track balances and payments.</div>'
      + '</div>';
  }

  var thisMonth = window.Ledger.monthKeyOf(window.Ledger.todayISO());

  var cardsHtml = cards.map(function(a){
    var bal = accountBalance(a.id);
    var isNeg = bal < 0;

    // Recent transactions for this card (last 5)
    var recentTx = DB.transactions.filter(function(t){
      if(t.type === "transfer"){
        return (t.fromId === a.id || t.toId === a.id) && !t.pending;
      }
      return t.account === a.id;
    }).sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); }).slice(0, 5);

    // This month spending on this card
    var monthSpend = 0;
    var monthPayments = 0;
    DB.transactions.forEach(function(t){
      if(t.date && window.Ledger.monthKeyOf(t.date) !== thisMonth) return;
      if(t.type === "expense" && t.account === a.id) monthSpend += t.amount;
      if(t.type === "refund" && t.account === a.id) monthPayments += t.amount;
      if(t.type === "transfer"){
        if(t.fromId === a.id) monthPayments += t.amount;
        if(t.toId === a.id) monthSpend += t.amount;
      }
    });

    var txHtml = recentTx.length === 0
      ? '<div style="font-size:12px; color:var(--text-faint); padding:8px 0;">No transactions yet</div>'
      : recentTx.map(function(t){
          var label = t.desc || "Transaction";
          if(t.type === "refund"){
            if(t.refundOf){
              var orig = DB.transactions.find(function(x){ return x.id === t.refundOf; });
              label = "Refund: " + (orig ? (orig.desc || "transaction") : "original");
            } else {
              label = t.desc || "Refund";
            }
          }
          var sign = (t.type === "income" || t.type === "refund") ? "+" : "\u2212";
          var color = (t.type === "income" || t.type === "refund") ? "pos" : "neg";
          return '<div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border-soft); font-size:12px;">'
            + '<div>'
            + '  <div style="font-weight:600;">' + escapeHtml(label) + '</div>'
            + '  <div style="font-size:11px; color:var(--text-faint);">' + t.date + '</div>'
            + '</div>'
            + '<span class="' + color + '" style="font-weight:700; font-variant-numeric:tabular-nums;">' + sign + fmtMoney(t.amount, a.currency) + '</span>'
            + '</div>';
        }).join("");

    return '<div class="card card-pad" style="margin-bottom:12px;">'
      + '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">'
      + '  <div>'
      + '    <div style="font-size:15px; font-weight:800;">' + escapeHtml(a.name) + ' <span style="font-size:12px; font-weight:500; color:var(--text-dim);">' + a.currency + '</span></div>'
      + '    <div style="font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; color:' + (isNeg ? 'var(--clay)' : 'var(--sage)') + '; margin-top:4px;">' + fmtMoney(bal, a.currency) + '</div>'
      + '    <div style="font-size:11px; color:var(--text-faint);">' + (isNeg ? 'owed' : 'credit available') + '</div>'
      + '  </div>'
      + '  <div style="text-align:right;">'
      + '    <div style="font-size:11px; color:var(--text-dim);">This month</div>'
      + '    <div style="font-size:12px; font-weight:600; color:var(--clay);">' + fmtMoney(monthSpend, a.currency) + ' spent</div>'
      + '    <div style="font-size:12px; font-weight:600; color:var(--sage);">' + fmtMoney(monthPayments, a.currency) + ' paid</div>'
      + '  </div>'
      + '</div>'
      + '<div style="font-size:12px; font-weight:700; color:var(--text-dim); margin-bottom:6px;">Recent transactions</div>'
      + txHtml
      + '<div style="margin-top:10px;">'
      + '  <button class="btn btn-sm" data-nav-link="transactions" data-filter-account="' + a.id + '">View all transactions &rarr;</button>'
      + '</div>'
      + '</div>';
  }).join("");

  return ''
    + '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0;">Credit Cards</h2>'
    + '  <button class="btn btn-primary btn-sm" id="addAcctBtn">+ Add credit card</button>'
    + '</div>'
    + cardsHtml;
};
