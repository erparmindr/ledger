window.Ledger = window.Ledger || {};

/* ============================================================
   PASTED STATEMENT TEXT PARSER (for PDF bank statements)
   ============================================================ */

window.Ledger.STMT_DATE_RE = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})|([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4})/;
window.Ledger.STMT_AMOUNT_RE = /(-?\(?\$?-?[\d,]+\.\d{2}\)?)\s*$/;
window.Ledger.TD_DATE_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{1,2})\s+/i;
window.Ledger.TD_AMOUNT_RE = /(-?[\d,]+\.\d{2})\s*$/;
window.Ledger.MONTH_MAP = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};

window.Ledger.parseTDDate = function(mon, day){
  var mm = window.Ledger.MONTH_MAP[mon.toLowerCase().slice(0,3)];
  if(!mm) return null;
  var now = new Date();
  var year = now.getFullYear();
  if(parseInt(mm,10) > now.getMonth()+1) year--;
  return year + "-" + mm + "-" + (day.length<2?"0"+day:day);
};

window.Ledger.isTDFormat = function(text){
  var lines = text.trim().split(/\r?\n/);
  var matched = 0;
  lines.slice(0,5).forEach(function(l){ if(window.Ledger.TD_DATE_RE.test(l.trim())) matched++; });
  return matched >= 1;
};

window.Ledger.parseStatementText = function(text){
  var lines = text.split(/\r?\n/);
  var results = [];

  if(window.Ledger.isTDFormat(text)){
    lines.forEach(function(rawLine, idx){
      var line = rawLine.trim();
      if(!line) return;
      var dm = line.match(window.Ledger.TD_DATE_RE);
      if(!dm) return;
      var isoDate = window.Ledger.parseTDDate(dm[3], dm[4]);
      if(!isoDate) return;
      var rest = line.replace(window.Ledger.TD_DATE_RE, "").trim();
      var amtMatch = rest.match(window.Ledger.TD_AMOUNT_RE);
      if(!amtMatch) return;
      var amtRaw = amtMatch[1].replace(/,/g,"");
      var amt = parseFloat(amtRaw);
      if(isNaN(amt)) return;
      var desc = rest.replace(window.Ledger.TD_AMOUNT_RE,"").replace(/\s+[A-Z]{2}\s*$/, "").trim();
      desc = desc.replace(/\s+[A-Z]{2}$/, "").trim();
      if(!desc) desc = "Imported transaction";
      results.push({ lineNumber:idx+1, raw:line, date:isoDate, amount:amt, desc:desc });
    });
    return results;
  }

  lines.forEach(function(rawLine, idx){
    var line = rawLine.trim();
    if(!line) return;
    var dateMatch = line.match(window.Ledger.STMT_DATE_RE);
    if(!dateMatch) return;
    var amtMatch = line.match(window.Ledger.STMT_AMOUNT_RE);
    if(!amtMatch) return;
    var dateStr = dateMatch[0];
    var isoDate = window.Ledger.normalizeDate(dateStr);
    if(!isoDate) return;
    var amtRaw = amtMatch[1];
    var isParenNegative = /^\(.*\)$/.test(amtRaw);
    var cleaned = amtRaw.replace(/[()$,]/g, "");
    var amt = parseFloat(cleaned);
    if(isNaN(amt)) return;
    if(isParenNegative) amt = -Math.abs(amt);
    var desc = line
      .replace(dateStr, "")
      .replace(amtMatch[0], "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\-:|,]+|[\s\-:|,]+$/g, "")
      .trim();
    if(!desc) desc = "Imported transaction";
    results.push({ lineNumber:idx+1, raw:line, date:isoDate, amount:amt, desc:desc });
  });
  return results;
};

window.Ledger.openStatementPasteModal = function(){
  var html = ''
    + '<div class="modal-head"><h3>Import from pasted statement text</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <p class="faint" style="font-size:12px; margin:0;">Open your PDF statement, select the transaction lines, copy, and paste them below. Works with most bank formats &mdash; you\'ll get a chance to review before anything is imported.</p>'
    + '  <div class="field"><textarea id="stmtPasteArea" rows="9" placeholder="Paste statement text here, e.g.:&#10;06/20/2026  GROCERY STORE PURCHASE   -45.20&#10;06/18/2026  PAYROLL DEPOSIT           2,000.00" style="min-height:160px; font-family:monospace; font-size:12px;"></textarea></div>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="parseStmtBtn">Parse text</button></div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("parseStmtBtn").addEventListener("click", function(){
      var text = document.getElementById("stmtPasteArea").value;
      if(!text.trim()){ window.Ledger.showToast("Paste some statement text first"); return; }
      var parsed = window.Ledger.parseStatementText(text);
      if(parsed.length === 0){
        window.Ledger.showToast("Couldn't find any date + amount lines in that text");
        return;
      }
      window.Ledger.openStatementPreviewModal(parsed);
    });
  });
};

/* ============================================================
   UNIFIED IMPORT PREVIEW SYSTEM
   ============================================================ */

window.Ledger.openImportPreviewModal = function(parsedRows, preselectedAccount, source, onBack){
  var accOpts = window.Ledger.DB.accounts.map(function(a){
    return '<option value="'+a.id+'" '+(a.id===preselectedAccount?'selected':'')+'>'+window.Ledger.escapeHtml(a.name)+'</option>';
  }).join("");
  var toAccOpts = '<option value="">Choose account&hellip;</option>' + window.Ledger.DB.accounts.map(function(a){
    return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+'</option>';
  }).join("");

  var thStyle = 'text-align:left; padding:7px 10px; font-size:10.5px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border); background:var(--surface-2); white-space:nowrap;';
  var tdStyle = 'padding:6px 8px; border-bottom:1px solid var(--border-soft); vertical-align:middle;';

  function catOptsFor(forType, selectedId){
    var catType = forType === "refund" ? "expense" : forType;
    var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === catType; });
    return '<option value="">Choose category&hellip;</option>' + relevant.map(function(c){
      return '<option value="'+c.id+'" '+(c.id===selectedId?'selected':'')+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }

  var REFUND_KW = /\b(refund|return|reversal|chargeback|credit\s*refund)\b/i;

  parsedRows.forEach(function(r){
    if(r.suggestedCategoryId === undefined){
      if(!r.type && REFUND_KW.test(r.desc)) r.type = "refund";
      var forType = r.type || (r.amount < 0 ? "expense" : "income");
      r.suggestedCategoryId = window.Ledger.suggestCategoryForDescription(r.desc, forType, window.Ledger.DB, window.Ledger.findCategory) || "";
    }
  });

  var rowsHtml = parsedRows.map(function(r, i){
    var preType = r.type || (r.amount < 0 ? "expense" : "income");
    return '<tr id="prev-row-'+i+'">'
      + '<td style="'+tdStyle+' text-align:center; width:32px;">'
      + '  <input type="checkbox" class="prev-chk" data-idx="'+i+'" checked style="width:15px;height:15px;cursor:pointer;">'
      + '</td>'
      + '<td style="'+tdStyle+' white-space:nowrap; font-size:12px;">'+r.date+'</td>'
      + '<td style="'+tdStyle+'">'
      + '  <input type="text" class="prev-desc" data-idx="'+i+'" value="'+window.Ledger.escapeHtml(r.desc)+'" style="width:100%; min-width:150px; background:transparent; border:none; border-bottom:1px solid var(--border-soft); padding:3px 4px; font-size:12.5px; color:var(--text);" title="Click to edit">'
      + '</td>'
      + '<td style="'+tdStyle+' text-align:right; font-weight:700; font-size:13px; white-space:nowrap; font-variant-numeric:tabular-nums;">'
      + window.Ledger.fmtMoney(Math.abs(r.amount))
      + '</td>'
      + '<td style="'+tdStyle+'">'
      + '  <select class="prev-type" data-idx="'+i+'" style="font-size:11.5px; padding:5px 7px; border-radius:8px; border:1px solid var(--border); background:var(--surface-2); color:var(--text);">'
      + '    <option value="expense" '+(preType==="expense"?"selected":"")+'>Expense</option>'
      + '    <option value="income" '+(preType==="income"?"selected":"")+'>Income</option>'
      + '    <option value="transfer" '+(preType==="transfer"?"selected":"")+'>Transfer</option>'
      + '    <option value="refund" '+(preType==="refund"?"selected":"")+'>Refund</option>'
      + '  </select>'
      + '</td>'
      + '<td style="'+tdStyle+'">'
      + '  <select class="prev-category" data-idx="'+i+'" style="font-size:11.5px; padding:5px 7px; border-radius:8px; border:1px solid ' + (r.suggestedCategoryId ? 'var(--sage)' : 'var(--clay)') + '; background:var(--surface-2); color:var(--text);">'
      + catOptsFor(preType, r.suggestedCategoryId)
      + '  </select>'
      + '</td>'
      + '<td style="'+tdStyle+' display:'+(preType==='transfer'?'':'none')+';">'
      + '  <select class="prev-toacc" data-idx="'+i+'" style="font-size:11.5px; padding:5px 7px; border-radius:8px; border:1px solid var(--clay); background:var(--surface-2); color:var(--text);">'
      + toAccOpts
      + '  </select>'
      + '</td>'
      + '</tr>';
  }).join("");

  var html = ''
    + '<div class="modal-head">'
    + '  <h3>Review '+parsedRows.length+' transaction'+(parsedRows.length===1?"":"s")+' <span class="faint" style="font-size:12px; font-weight:500;">from '+window.Ledger.escapeHtml(source||"import")+'</span></h3>'
    + '  <button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    + '</div>'
    + '<div class="modal-body">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">'
    + '    <p class="faint" style="font-size:11.5px; margin:0;">Edit descriptions, flip types, uncheck rows to skip. Categories are auto-suggested &mdash; a category is required for every checked row.</p>'
    + '    <div style="display:flex; gap:8px;">'
    + '      <button class="btn btn-sm" id="selectAllBtn">Check all</button>'
    + '      <button class="btn btn-sm" id="deselectAllBtn">Uncheck all</button>'
    + '      <button class="btn btn-sm" id="flipSignsBtn" style="color:var(--clay);">Flip Expense&harr;Income</button>'
    + '    </div>'
    + '  </div>'
    + '  <div style="overflow:auto; max-height:360px; border:1px solid var(--border); border-radius:var(--radius);">'
    + '    <table style="width:100%; border-collapse:collapse;">'
    + '      <tr>'
    + '        <th style="'+thStyle+'"></th>'
    + '        <th style="'+thStyle+'">Date</th>'
    + '        <th style="'+thStyle+'">Description</th>'
    + '        <th style="'+thStyle+' text-align:right;">Amount</th>'
      + '        <th style="'+thStyle+'">Type</th>'
      + '        <th style="'+thStyle+'">Category</th>'
      + '      </tr>'
    + rowsHtml
    + '    </table>'
    + '  </div>'
    + '  <div class="field"><label>Import into account</label><select id="prevAccount">'+accOpts+'</select></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + (onBack ? '<button class="btn" id="backBtn">Back</button>' : '<button class="btn" id="cancelImportBtn">Cancel</button>')
    + '  <button class="btn btn-primary" id="confirmImportBtn">Import checked rows</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    var cancelBtn = document.getElementById("cancelImportBtn");
    if(cancelBtn) cancelBtn.addEventListener("click", window.Ledger.closeModal);
    var backBtn = document.getElementById("backBtn");
    if(backBtn) backBtn.addEventListener("click", function(){ window.Ledger.closeModal(); if(onBack) onBack(); });
    document.getElementById("selectAllBtn").addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".prev-chk"), function(c){ c.checked = true; });
    });
    document.getElementById("deselectAllBtn").addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".prev-chk"), function(c){ c.checked = false; });
    });
    document.getElementById("flipSignsBtn").addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".prev-type"), function(sel){
        if(sel.value === "expense") sel.value = "income";
        else if(sel.value === "income") sel.value = "expense";
        sel.dispatchEvent(new Event("change"));
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-type"), function(sel){
      sel.addEventListener("change", function(){
        var idx = parseInt(sel.getAttribute("data-idx"), 10);
        var catSel = document.querySelector('.prev-category[data-idx="'+idx+'"]');
        var toAccTd = document.querySelector('.prev-toacc[data-idx="'+idx+'"]');
        if(toAccTd && toAccTd.parentElement) toAccTd.parentElement.style.display = sel.value === "transfer" ? "" : "none";
        if(catSel){
          var suggestion = window.Ledger.suggestCategoryForDescription(parsedRows[idx].desc, sel.value, window.Ledger.DB, window.Ledger.findCategory) || "";
          catSel.innerHTML = catOptsFor(sel.value, suggestion);
          catSel.style.borderColor = suggestion ? "var(--sage)" : "var(--clay)";
        }
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".prev-category"), function(sel){
      sel.addEventListener("change", function(){
        sel.style.borderColor = sel.value ? "var(--sage)" : "var(--clay)";
      });
    });

    document.getElementById("confirmImportBtn").addEventListener("click", function(){
      var account = document.getElementById("prevAccount").value;
      if(!account){ window.Ledger.showToast("Choose an account"); return; }
      var checks = document.querySelectorAll(".prev-chk");
      var descs  = document.querySelectorAll(".prev-desc");
      var types  = document.querySelectorAll(".prev-type");
      var cats   = document.querySelectorAll(".prev-category");
      var toAccs = document.querySelectorAll(".prev-toacc");

      var missing = [];
      Array.prototype.forEach.call(checks, function(chk, i){
        if(chk.checked && types[i].value !== "transfer" && !cats[i].value) missing.push(i+1);
        if(chk.checked && types[i].value === "transfer" && !cats[i].value) missing.push(i+1);
      });
      if(missing.length){
        window.Ledger.showToast("Pick a category for row" + (missing.length===1?"":"s") + " " + missing.join(", ") + " (or uncheck to skip)");
        return;
      }

      var imported = 0;
      var importedIds = [];
      Array.prototype.forEach.call(checks, function(chk, i){
        if(!chk.checked) return;
        var r = parsedRows[i];
        var chosenType = types[i].value;
        var chosenDesc = descs[i].value.trim() || r.desc || "Imported transaction";
        var chosenCategory = cats[i].value;

        if(chosenType === "transfer"){
          var toAccountId = toAccs[i].value;
          var isPending = !toAccountId;
          var newId = window.Ledger.uid();
          var txObj = {
            id: newId, type: "transfer", date: r.date, amount: Math.abs(r.amount),
            desc: chosenDesc, notes: "Imported from " + (source||"import"),
            account: account, category: chosenCategory, subcategory: "", created: Date.now(),
            fromType: "account", fromId: account, pending: isPending
          };
          if(toAccountId){
            txObj.toType = "account";
            txObj.toId = toAccountId;
          }
          window.Ledger.DB.transactions.push(txObj);
          importedIds.push(newId);
        } else {
          var newId2 = window.Ledger.uid();
          window.Ledger.DB.transactions.push({
            id: newId2, type: chosenType, date: r.date, amount: Math.abs(r.amount),
            desc: chosenDesc, notes: "Imported from " + (source||"import"),
            account: account, category: chosenCategory, subcategory: "", created: Date.now()
          });
          importedIds.push(newId2);
          window.Ledger.learnCategoryMapping(chosenDesc, chosenCategory, window.Ledger.DB);
        }
        imported++;
      });
      window.Ledger.saveData();
      window.Ledger.closeModal();
      window.Ledger.showToast(imported + " transaction"+(imported===1?"":"s")+" imported");
      window.Ledger.renderPage();
      window.Ledger.promptLinkTransfers(account, importedIds);
    });
  });
};

/* ============================================================
   POST-IMPORT TRANSFER LINKING
   ============================================================ */
window.Ledger.promptLinkTransfers = function(importedAccountId, importedIds){
  if(!importedIds || !importedIds.length) return;

  var candidates = [];
  importedIds.forEach(function(newId){
    var newTx = window.Ledger.DB.transactions.find(function(t){ return t.id === newId; });
    if(!newTx) return;

    var matches = window.Ledger.DB.transactions.filter(function(t){
      if(t.id === newId) return false;
      if(t.type !== "transfer") return false;
      var sameAmount = Math.abs(t.amount) === Math.abs(newTx.amount);
      if(!sameAmount) return false;
      var d1 = new Date(t.date), d2 = new Date(newTx.date);
      var diffDays = Math.abs((d1 - d2) / 86400000);
      if(diffDays > 2) return false;
      var touchesImported = (t.fromId === importedAccountId || t.toId === importedAccountId);
      return touchesImported;
    });

    matches.forEach(function(m){
      var alreadyListed = candidates.some(function(c){ return c.existing.id === m.id && c.newTx.id === newTx.id; });
      if(!alreadyListed) candidates.push({ newTx: newTx, existing: m });
    });
  });

  if(candidates.length === 0) return;

  var fromAcc = window.Ledger.findAccount(importedAccountId);
  var fromName = fromAcc ? fromAcc.name : "Account";

  var rowsHtml = candidates.map(function(c, i){
    var toAccId = c.existing.fromId === importedAccountId ? c.existing.toId : c.existing.fromId;
    var toAcc = window.Ledger.findAccount(toAccId);
    var toName = toAcc ? toAcc.name : "Unknown";
    return '<div style="display:flex; align-items:center; gap:12px; padding:12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface-2);" data-link-idx="'+i+'">'
      + '<div style="flex:1; min-width:0;">'
      + '  <div style="font-size:12.5px; font-weight:600; margin-bottom:4px;">'
      + window.Ledger.escapeHtml(c.newTx.desc) + ' &middot; ' + window.Ledger.fmtMoney(Math.abs(c.newTx.amount))
      + '  <span class="faint" style="font-size:11px;">(' + c.newTx.date + ')</span>'
      + '  </div>'
      + '  <div style="font-size:11.5px; color:var(--text-dim);">'
      + '    Existing transfer: ' + window.Ledger.escapeHtml(fromName) + ' &rarr; ' + window.Ledger.escapeHtml(toName)
      + '    &middot; ' + window.Ledger.fmtMoney(Math.abs(c.existing.amount))
      + '    <span class="faint">(' + c.existing.date + ')</span>'
      + '  </div>'
      + '</div>'
      + '<div style="display:flex; gap:6px;">'
      + '  <button class="btn btn-sm btn-primary link-yes" data-new="'+c.newTx.id+'" data-existing="'+c.existing.id+'">Link</button>'
      + '  <button class="btn btn-sm link-no" data-new="'+c.newTx.id+'">Skip</button>'
      + '</div>'
      + '</div>';
  }).join("");

  var html = ''
    + '<div class="modal-head"><h3>Link related transfers?</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <p class="faint" style="font-size:12px; margin:0 0 12px;">We found ' + candidates.length + ' transaction'+(candidates.length===1?'':'s')+' that may be the other side of an existing transfer. Link them to keep your records clean.</p>'
    + '  <div style="display:flex; flex-direction:column; gap:8px;">' + rowsHtml + '</div>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn" id="doneLinkBtn">Done</button></div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("doneLinkBtn").addEventListener("click", window.Ledger.closeModal);

    Array.prototype.forEach.call(document.querySelectorAll(".link-yes"), function(btn){
      btn.addEventListener("click", function(){
        var newId = btn.getAttribute("data-new");
        var existingId = btn.getAttribute("data-existing");
        var newTx = window.Ledger.DB.transactions.find(function(t){ return t.id === newId; });
        var existingTx = window.Ledger.DB.transactions.find(function(t){ return t.id === existingId; });
        if(newTx && existingTx){
          existingTx.amount = Math.max(Math.abs(existingTx.amount), Math.abs(newTx.amount));
          existingTx.desc = existingTx.desc + " / " + newTx.desc;
          window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(t){ return t.id !== newId; });
          window.Ledger.saveData();
          var wrapper = btn.closest('[data-link-idx]');
          if(wrapper) wrapper.remove();
          window.Ledger.showToast("Transfer linked");
        }
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".link-no"), function(btn){
      btn.addEventListener("click", function(){
        var wrapper = btn.closest('[data-link-idx]');
        if(wrapper) wrapper.remove();
      });
    });
  });
};

window.Ledger.openStatementPreviewModal = function(parsedRows, preselectedAccount){
  window.Ledger.openImportPreviewModal(parsedRows, preselectedAccount||"", "pasted statement", window.Ledger.openStatementPasteModal);
};

/* ============================================================
   PENDING TRANSFERS — helpers + link modal
   ============================================================ */
window.Ledger.pendingTransfers = function(){
  return window.Ledger.DB.transactions.filter(function(t){
    return t.type === "transfer" && t.pending;
  }).sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); });
};

window.Ledger.unlinkedRefunds = function(){
  return window.Ledger.DB.transactions.filter(function(t){
    return t.type === "refund" && !t.refundOf;
  }).sort(function(a,b){ return (b.date+b.id).localeCompare(a.date+a.id); });
};

window.Ledger.openLinkTransferModal = function(txId){
  var tx = window.Ledger.DB.transactions.find(function(t){ return t.id === txId; });
  if(!tx || tx.type !== "transfer") return;

  var fromAcc = window.Ledger.findAccount(tx.fromId);
  var fromName = fromAcc ? fromAcc.name : "Unknown";
  var otherAccs = window.Ledger.DB.accounts.filter(function(a){ return a.id !== tx.fromId; });
  var otherAccOpts = otherAccs.map(function(a){
    return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+'</option>';
  }).join("");

  var html = ''
    + '<div class="modal-head"><h3>Link destination</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div style="padding:12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface-2); margin-bottom:16px;">'
    + '    <div style="font-size:13px; font-weight:600;">' + window.Ledger.escapeHtml(tx.desc) + ' &middot; ' + window.Ledger.fmtMoney(tx.amount) + '</div>'
    + '    <div style="font-size:12px; color:var(--text-dim); margin-top:4px;">From: ' + window.Ledger.escapeHtml(fromName) + ' &middot; ' + tx.date + '</div>'
    + '  </div>'
    + '  <div class="field"><label>To account</label><select id="linkToAcc">' + otherAccOpts + '</select></div>'
    + '  <div class="field"><label>Description <span class="faint">(optional)</span></label>'
    + '    <input type="text" id="linkDesc" value="'+window.Ledger.escapeHtml(tx.desc)+'" placeholder="e.g. Credit Card Payment">'
    + '  </div>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="confirmLinkBtn">Link transfer</button></div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("confirmLinkBtn").addEventListener("click", function(){
      var toAccountId = document.getElementById("linkToAcc").value;
      var newDesc = document.getElementById("linkDesc").value.trim();
      if(!toAccountId){ window.Ledger.showToast("Pick a destination account"); return; }
      tx.toType = "account";
      tx.toId = toAccountId;
      tx.pending = false;
      if(newDesc) tx.desc = newDesc;
      window.Ledger.saveData();
      window.Ledger.closeModal();
      window.Ledger.showToast("Transfer linked");
      window.Ledger.renderPage();
    });
  });
};
