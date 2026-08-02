(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   UTILITIES
   ============================================================ */
window.Ledger.uid = function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,9);
};
window.Ledger.pad2 = function pad2(n){ n = String(n); return n.length < 2 ? "0" + n : n; };
window.Ledger.escapeHtml = function escapeHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
};
window.Ledger.fmtMoney = function fmtMoney(n, currency){
  currency = currency || "USD";
  if(typeof n !== "number" || isNaN(n)) n = 0;
  var neg = n < 0;
  var abs = Math.abs(n);
  var noDecimals = currency === "JPY";
  var str = abs.toLocaleString(undefined, {minimumFractionDigits: noDecimals ? 0 : 2, maximumFractionDigits: noDecimals ? 0 : 2});
  var symbols = {USD:"$",CAD:"$",EUR:"\u20AC",GBP:"\u00A3",INR:"\u20B9",AUD:"$",JPY:"\u00A5"};
  var sym = symbols[currency] || (currency + " ");
  return (neg ? "\u2212" : "") + sym + str;
};
window.Ledger.fmtMoneyShort = function fmtMoneyShort(n, currency){
  currency = currency || "USD";
  if(typeof n !== "number" || isNaN(n)) n = 0;
  var neg = n < 0;
  var abs = Math.abs(n);
  var symbols = {USD:"$",CAD:"$",EUR:"\u20AC",GBP:"\u00A3",INR:"\u20B9",AUD:"$",JPY:"\u00A5"};
  var sym = symbols[currency] || (currency + " ");
  var str;
  if(abs >= 1000000) str = (abs/1000000).toFixed(1)+"M";
  else if(abs >= 1000) str = (abs/1000).toFixed(1)+"k";
  else str = abs.toFixed(0);
  return (neg ? "\u2212" : "") + sym + str;
};
window.Ledger.todayISO = function todayISO(){
  var d = new Date();
  return d.getFullYear() + "-" + window.Ledger.pad2(d.getMonth()+1) + "-" + window.Ledger.pad2(d.getDate());
};
window.Ledger.monthKeyOf = function monthKeyOf(dateStr){ return dateStr.slice(0,7); };

window.Ledger.safeDate = function safeDate(dateStr){
  if(typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  var d = new Date(dateStr + "T00:00:00");
  if(isNaN(d.getTime())) return null;
  return d;
};
window.Ledger.dateLabel = function dateLabel(dateStr, opts){
  var d = window.Ledger.safeDate(dateStr);
  if(!d) return "\u2014";
  return d.toLocaleDateString(undefined, opts || {month:"short", day:"numeric"});
};

/* Associate un-for'd <label> elements with the first control in their
   .field container so every form control has a programmatic name. */
window.Ledger.associateLabels = function associateLabels(root){
  root = root || document;
  var n = 0;
  Array.prototype.forEach.call(root.querySelectorAll(".field, .form-row > div, .modal-row, .drow"), function(field){
    var label = field.querySelector("label");
    if(!label || label.getAttribute("for")) return;
    var ctrl = field.querySelector(".cd-wrap[role='combobox']");
    if(!ctrl) ctrl = field.querySelector("input:not([type='hidden']), select, textarea");
    if(!ctrl) return;
    var id = ctrl.id || ctrl.getAttribute("id");
    if(!id){
      id = "auto-fld-" + (++n) + "-" + Math.random().toString(36).slice(2, 7);
      ctrl.setAttribute("id", id);
    }
    label.setAttribute("for", id);
  });
};

/* Entity lookup */
window.Ledger.findAccount = function findAccount(id){ return Ledger.DB.accounts.find(function(a){ return a.id === id; }); };
window.Ledger.findPerson = function findPerson(id){ return Ledger.DB.people.find(function(p){ return p.id === id; }); };
window.Ledger.findCategory = function findCategory(id){ return Ledger.DB.categories.find(function(c){ return c.id === id; }); };
window.Ledger.activeAccounts = function activeAccounts(){ return Ledger.DB.accounts.filter(function(a){ return !a.archived; }); };

window.Ledger.entityRef = function entityRef(type, id){
  if(type === "account"){ var a = window.Ledger.findAccount(id); return a ? {name:a.name, currency:a.currency, kind:"account", obj:a} : null; }
  if(type === "person"){ var p = window.Ledger.findPerson(id); return p ? {name:p.name, currency:null, kind:"person", obj:p} : null; }
  return null;
};

/* Balance computation */
window.Ledger.accountBalance = function accountBalance(accountId){
  var acc = window.Ledger.findAccount(accountId);
  if(!acc) return 0;
  var noDecimals = acc.currency === "JPY";
  var bal = acc.openingBalance || 0;
  Ledger.DB.transactions.forEach(function(t){
    var amt = t.amount;
    if(typeof amt !== "number" || isNaN(amt) || !isFinite(amt)) return;
    if(t.type === "expense" && t.account === accountId) bal -= amt;
    else if(t.type === "income" && t.account === accountId) bal += amt;
    else if(t.type === "refund" && t.account === accountId) bal += amt;
    else if(t.type === "transfer"){
      if(t.pending){
        if(t.fromType === "account" && t.fromId === accountId) bal -= amt;
      } else {
        if(t.fromType === "account" && t.fromId === accountId) bal -= amt;
        if(t.toType === "account" && t.toId === accountId) bal += amt;
      }
    }
  });
  return noDecimals ? Math.round(bal) : Math.round(bal * 100) / 100;
};

window.Ledger.personBalanceByCurrency = function personBalanceByCurrency(personId){
  var p = window.Ledger.findPerson(personId);
  if(!p) return {};
  var byCur = {};
  function add(cur, amt){
    if(!cur) cur = "USD";
    byCur[cur] = (byCur[cur]||0) + amt;
  }
  Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "transfer") return;
    if(t.debtItemId) return;
    var amt = t.amount;
    if(typeof amt !== "number" || isNaN(amt) || !isFinite(amt)) return;
    if(t.toType === "person" && t.toId === personId){
      var fromRef = window.Ledger.entityRef(t.fromType, t.fromId);
      add(fromRef ? fromRef.currency : "USD", amt);
    }
    if(t.fromType === "person" && t.fromId === personId){
      var toRef = window.Ledger.entityRef(t.toType, t.toId);
      add(toRef ? toRef.currency : "USD", -amt);
    }
  });
  Ledger.DB.debtItems.forEach(function(d){
    if(d.personId === personId && d.status === "open"){
      add(d.currency || "USD", d.amount);
    }
  });
  Object.keys(byCur).forEach(function(cur){
    if(Math.abs(byCur[cur]) < 0.005) delete byCur[cur];
  });
  return byCur;
};

/* Debt/Loan helpers */
window.Ledger.openDebtItemsForPerson = function openDebtItemsForPerson(personId){
  return Ledger.DB.debtItems.filter(function(d){ return d.personId === personId && d.status === "open"; })
    .sort(function(a,b){ return b.date.localeCompare(a.date); });
};

window.Ledger.pendingDebtItems = function pendingDebtItems(){
  return Ledger.DB.debtItems.filter(function(d){ return d.status === "pending" && !d.personId; })
    .sort(function(a,b){ return b.date.localeCompare(a.date); });
};

/* Category helpers */
window.Ledger.categoryHasSubs = function categoryHasSubs(catId){
  var c = window.Ledger.findCategory(catId);
  return !!(c && c.subs && c.subs.length > 0);
};

window.Ledger.categoryName = function categoryName(catId){
  var c = window.Ledger.findCategory(catId);
  return c ? c.name : "Uncategorized";
};
window.Ledger.subcatName = function subcatName(catId, subId){
  var c = window.Ledger.findCategory(catId);
  if(!c) return "";
  var s = c.subs.find(function(s){ return s.id === subId; });
  return s ? s.name : "";
};

window.Ledger.CAT_PALETTE = ["#E8B33C","#1F9D6E","#E2502F","#8B6FE8","#2E78D2","#E0599C","#7FBF4D","#E8884C","#5B8FE6","#C99A2E","#3FB89E","#D9669A"];
window.Ledger.categoryColor = function categoryColor(catId){
  var idx = Ledger.DB.categories.findIndex(function(c){ return c.id === catId; });
  if(idx < 0) idx = 0;
  return Ledger.CAT_PALETTE[idx % Ledger.CAT_PALETTE.length];
};

/* UI utilities */
window.Ledger.refreshIcons = function refreshIcons(){
  if(window.lucide && typeof window.lucide.createIcons === "function"){
    try{ window.lucide.createIcons(); }catch(e){}
  }
};

window.Ledger.showToast = function showToast(msg){
  var root = document.getElementById("toastRoot");
  var el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  root.innerHTML = "";
  root.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2600);
};

/* ---- Reconciliation helpers ---- */
window.Ledger.needsVerification = function needsVerification(account){
  var now = new Date();
  var thisMonth = now.getFullYear() + "-" + window.Ledger.pad2(now.getMonth()+1);
  var created = new Date(account.created);
  var createdMonth = created.getFullYear() + "-" + window.Ledger.pad2(created.getMonth()+1);
  if(createdMonth >= thisMonth) return false;
  if(!account.reconciledAt) return true;
  var recDate = new Date(account.reconciledAt);
  var recMonth = recDate.getFullYear() + "-" + window.Ledger.pad2(recDate.getMonth()+1);
  return recMonth < thisMonth;
};

window.Ledger.accountBreakdown = function accountBreakdown(accountId){
  var acc = window.Ledger.findAccount(accountId);
  if(!acc) return null;
  var noDecimals = acc.currency === "JPY";
  var opening = acc.openingBalance || 0;
  var income = 0, expense = 0, refund = 0, transferOut = 0, transferIn = 0;
  window.Ledger.DB.transactions.forEach(function(t){
    var amt = t.amount;
    if(typeof amt !== "number" || isNaN(amt)) return;
    if(t.type === "income" && t.account === accountId) income += amt;
    else if(t.type === "expense" && t.account === accountId) expense += amt;
    else if(t.type === "refund" && t.account === accountId) refund += amt;
    else if(t.type === "transfer"){
      if(t.pending){
        if(t.fromType === "account" && t.fromId === accountId) transferOut += amt;
      } else {
        if(t.fromType === "account" && t.fromId === accountId) transferOut += amt;
        if(t.toType === "account" && t.toId === accountId) transferIn += amt;
      }
    }
  });
  var computed = opening + income - expense + refund - transferOut + transferIn;
  return { opening:opening, income:income, expense:expense, refund:refund, transferOut:transferOut, transferIn:transferIn, computed:noDecimals ? Math.round(computed) : Math.round(computed*100)/100 };
};

window.Ledger._dupeKey = function _dupeKey(tx){
  var normDesc = (tx.desc || tx.description || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
  return (tx.date||"") + "|" + (tx.type||"") + "|" + (tx.account||"") + "|" + String(tx.amount) + "|" + normDesc;
};

window.Ledger.findDuplicates = function findDuplicates(accountId){
  var txs = window.Ledger.DB.transactions.filter(function(t){
    return t.account === accountId || (t.fromType === "account" && t.fromId === accountId) || (t.toType === "account" && t.toId === accountId);
  });
  var map = {};
  txs.forEach(function(t){
    var k = window.Ledger._dupeKey(t);
    if(!map[k]) map[k] = [];
    map[k].push(t);
  });
  var dupes = [];
  Object.keys(map).forEach(function(k){
    if(map[k].length > 1) dupes.push(map[k][0]);
  });
  return dupes;
};

window.Ledger.findAllDuplicates = function findAllDuplicates(){
  var txs = window.Ledger.DB.transactions;
  var map = {};
  txs.forEach(function(t){
    var k = window.Ledger._dupeKey(t);
    if(!map[k]) map[k] = [];
    map[k].push(t);
  });
  var groups = [];
  Object.keys(map).forEach(function(k){
    if(map[k].length > 1) groups.push(map[k]);
  });
  return groups;
};

window.Ledger.findOrphanTransfers = function findOrphanTransfers(accountId){
  var orphans = [];
  window.Ledger.DB.transactions.forEach(function(t){
    if(t.type !== "transfer") return;
    if(t.fromType === "account" && t.fromId === accountId && (!t.toId || !window.Ledger.findAccount(t.toId))){
      orphans.push(t);
    }
    if(t.toType === "account" && t.toId === accountId && (!t.fromId || !window.Ledger.findAccount(t.fromId))){
      orphans.push(t);
    }
  });
  return orphans;
};

window.Ledger.filterTransactions = function(state, types, matchDateFn, opts){
  opts = opts || {};
  return window.Ledger.DB.transactions.filter(function(t){
    if(types && types.indexOf(t.type) === -1) return false;
    if(opts.hideLinked && t.linkId) return false;
    if(state.type !== "all" && t.type !== state.type) return false;
    if(state.account !== "all"){
      var touches = (t.account === state.account) ||
        (t.fromType==="account" && t.fromId===state.account) ||
        (t.toType==="account" && t.toId===state.account);
      if(!touches) return false;
    }
    if(state.currency !== "all"){
      var cur = null;
      if(t.account){ var a = window.Ledger.findAccount(t.account); cur = a ? a.currency : null; }
      else if(t.fromType==="account"){ var a2=window.Ledger.findAccount(t.fromId); cur = a2?a2.currency:null; }
      else if(t.toType==="account"){ var a3=window.Ledger.findAccount(t.toId); cur = a3?a3.currency:null; }
      if(cur !== state.currency) return false;
    }
    if(state.category !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.categoryId === state.category; })) return false;
      } else if(t.category !== state.category) return false;
    }
    if(state.subcategory !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.subcategoryId === state.subcategory; })) return false;
      } else if(t.subcategory !== state.subcategory) return false;
    }
    if(opts.uncategorized){
      if(t.type === "transfer") return false;
      if(t.categorySplits && t.categorySplits.length) return false;
      if(t.category) return false;
    }
    if(matchDateFn && !matchDateFn(t.date)) return false;
    if(state.search && state.search.trim()){
      var q = state.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

})();
