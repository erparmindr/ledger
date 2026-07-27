(function(){
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
   UNIFIED IMPORT PREVIEW SYSTEM — grouped by description
   ============================================================ */

window.Ledger.openImportPreviewModal = function(parsedRows, preselectedAccount, source, onBack){
  var accOpts = window.Ledger.DB.accounts.filter(function(a){ return !a.archived; }).map(function(a){
    return '<option value="'+a.id+'" '+(a.id===preselectedAccount?'selected':'')+'>'+window.Ledger.escapeHtml(a.name)+'</option>';
  }).join("");

  var REFUND_KW = /\b(refund|return|reversal|chargeback|cashback|rebate|reward|credit\s*refund)\b/i;

  parsedRows.forEach(function(r){
    if(r.suggestedCategoryId === undefined){
      if(!r.type && REFUND_KW.test(r.desc)) r.type = "refund";
      var isCreditCard = preselectedAccount && (window.Ledger.findAccount(preselectedAccount) || {}).type === "credit_card";
      var forType = r.type || (r.amount < 0 ? "expense" : isCreditCard ? "expense" : "income");
      var sug = window.Ledger.suggestCategoryForDescription(r.desc, forType, window.Ledger.DB, window.Ledger.findCategory);
      r.suggestedCategoryId = sug ? sug.categoryId : "";
      r.suggestedSubcategoryId = sug ? (sug.subcategoryId || "") : "";
    }
    var isCreditCard = preselectedAccount && (window.Ledger.findAccount(preselectedAccount) || {}).type === "credit_card";
    r._type = r.type || (r.amount < 0 ? "expense" : isCreditCard ? "expense" : "income");
  });

  var existingSet = {};
  (window.Ledger.DB.transactions || []).forEach(function(t){
    var normDesc = (t.desc || t.description || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
    var k = (t.date||"") + "|" + String(t.amount) + "|" + normDesc;
    existingSet[k] = true;
  });
  var dupeCount = 0;
  parsedRows.forEach(function(r){
    var normDesc = (r.desc || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
    var k = (r.date||"") + "|" + String(r.amount) + "|" + normDesc;
    r._potentialDupe = !!existingSet[k];
    if(r._potentialDupe) dupeCount++;
  });

  var groups = [];
  var groupMap = {};
  parsedRows.forEach(function(r, idx){
    var raw = (r.desc || "").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
    var norm = window.Ledger.normalizeMerchant ? window.Ledger.normalizeMerchant(r.desc) : raw;
    var key = norm || raw || "__empty__";
    if(!groupMap[key]){
      groupMap[key] = { key:key, desc:r.desc, rows:[], categoryId:r.suggestedCategoryId||"", subcategoryId:r.suggestedSubcategoryId||"" };
      groups.push(groupMap[key]);
    }
    groupMap[key].rows.push({ parsedRow:r, idx:idx });
    if(r.suggestedCategoryId && !groupMap[key].categoryId){
      groupMap[key].categoryId = r.suggestedCategoryId;
      groupMap[key].subcategoryId = r.suggestedSubcategoryId || "";
    }
  });

  groups.sort(function(a,b){
    if(!a.categoryId && b.categoryId) return -1;
    if(a.categoryId && !b.categoryId) return 1;
    return b.rows.length - a.rows.length;
  });

  function catOptsAll(forType, selectedId){
    var filtered = window.Ledger.DB.categories.filter(function(c){
      if(forType === "expense" || forType === "refund") return c.type === "expense";
      if(forType === "income") return c.type !== "expense";
      return true;
    });
    return '<option value="">Choose category\u2026</option>' + filtered.map(function(c){
      return '<option value="'+c.id+'" '+(c.id===selectedId?'selected':'')+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }

  function subOptsFor(catId, selectedId){
    if(!catId) return '';
    var cat = window.Ledger.findCategory(catId);
    if(!cat || !cat.subs || !cat.subs.length) return '';
    return '<option value="">None</option>' + cat.subs.map(function(s){
      return '<option value="'+s.id+'" '+(s.id===selectedId?'selected':'')+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
    }).join("");
  }

  var totalRows = parsedRows.length;
  var catCount = 0, uncatCount = 0;
  groups.forEach(function(g){ if(g.categoryId) catCount += g.rows.length; else uncatCount += g.rows.length; });

  var summaryHtml = '<div class="prev-summary">'
    + '<span>'+groups.length+' unique description'+(groups.length!==1?'s':'')+' \u00B7 '+totalRows+' transaction'+(totalRows!==1?'s':'')+'</span>'
    + '<span style="display:flex; gap:14px;">'
    + '<span class="prev-summary-stat"><span class="prev-summary-dot ok"></span> '+catCount+' categorized</span>'
    + (uncatCount > 0 ? '<span class="prev-summary-stat"><span class="prev-summary-dot warn"></span> '+uncatCount+' uncategorized</span>' : '')
    + (dupeCount > 0 ? '<span class="prev-summary-stat"><span class="prev-summary-dot dupe"></span> '+dupeCount+' may be duplicates</span>' : '')
    + '</span></div>';

  var groupsHtml = groups.map(function(g, gi){
    var isUncat = !g.categoryId;
    var groupTotal = g.rows.reduce(function(s,item){ return s + Math.abs(item.parsedRow.amount); }, 0);
    var amtDisplay = window.Ledger.fmtMoneyShort ? window.Ledger.fmtMoneyShort(groupTotal) : window.Ledger.fmtMoney(groupTotal);

    var subHtml = subOptsFor(g.categoryId, g.subcategoryId);
    var catBorder = g.categoryId ? 'border-sage' : 'border-clay';

    var hasDupes = g.rows.some(function(item){ return item.parsedRow._potentialDupe; });
    var rowsDetail = g.rows.map(function(item){
      var r = item.parsedRow;
      var sign = r._type==="income"||r._type==="refund" ? "+" : "\u2212";
      var amtCls = (r._type==="income"||r._type==="refund") ? ' style="color:var(--sage)"' : (r._type==="transfer" ? '' : ' style="color:var(--clay)"');
      var dupeCls = r._potentialDupe ? " is-dupe" : "";
      return '<div class="prev-sub-row'+dupeCls+'" data-row-idx="'+item.idx+'">'
        + '<span class="prev-sub-date">'+r.date+(r._potentialDupe?' \u26A0':'')+'</span>'
        + '<span class="prev-sub-desc" title="'+window.Ledger.escapeHtml(r.desc)+'">'+window.Ledger.escapeHtml(r.desc)+'</span>'
        + '<span class="prev-sub-amt"'+amtCls+'>'+sign+window.Ledger.fmtMoney(Math.abs(r.amount))+'</span>'
        + '</div>';
    }).join("");

    return '<div class="prev-group'+(isUncat?' prev-group-uncat':'')+(hasDupes?' has-dupes':'')+'" data-gi="'+gi+'">'
      + '<div class="prev-group-row" data-gi="'+gi+'">'
      + '<input type="checkbox" class="prev-group-check" data-gi="'+gi+'" checked>'
      + '<span class="prev-group-toggle" data-gi="'+gi+'">&#9654;</span>'
      + '<span class="prev-group-desc" title="'+window.Ledger.escapeHtml(g.desc)+'">'+window.Ledger.escapeHtml(g.desc)+'</span>'
      + '<span class="prev-group-count">'+g.rows.length+' &times; '+amtDisplay+'</span>'
      + '<select class="prev-group-cat prev-category '+catBorder+'" data-gi="'+gi+'">'+catOptsAll(g.rows[0].parsedRow._type, g.categoryId)+'</select>'
      + (subHtml ? '<select class="prev-group-sub" data-gi="'+gi+'">'+subHtml+'</select>' : '')
      + '</div>'
      + '<div class="prev-group-rows" data-gi="'+gi+'">'+rowsDetail+'</div>'
      + '</div>';
  }).join("");

  var html = ''
    + '<div class="modal-head">'
    + '  <h3>Review import <span class="faint" style="font-size:12px; font-weight:500;">from '+window.Ledger.escapeHtml(source||"import")+'</span></h3>'
    + '  <button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    + '</div>'
    + '<div class="modal-body">'
    + summaryHtml
    + '<div class="prev-groups">'+groupsHtml+'</div>'
    + '<div class="field"><label>Import into account</label><select id="prevAccount">'+accOpts+'</select></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + (onBack ? '<button class="btn" id="backBtn">Back</button>' : '<button class="btn" id="cancelImportBtn">Cancel</button>')
    + '  <button class="btn btn-primary" id="confirmImportBtn">Import checked rows</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", function(){ window.Ledger.closeModal(); window.Ledger.closeModal(); });
    var cancelBtn = document.getElementById("cancelImportBtn");
    if(cancelBtn) cancelBtn.addEventListener("click", function(){ window.Ledger.closeModal(); window.Ledger.closeModal(); });
    var backBtn = document.getElementById("backBtn");
    if(backBtn) backBtn.addEventListener("click", function(){ window.Ledger.closeModal(); window.Ledger.closeModal(); if(onBack) onBack(); });

    function toggleGroup(gi){
      var rows = document.querySelector('.prev-group-rows[data-gi="'+gi+'"]');
      var toggle = document.querySelector('.prev-group-toggle[data-gi="'+gi+'"]');
      if(rows){ rows.classList.toggle("open"); }
      if(toggle){ toggle.classList.toggle("open"); }
    }

    Array.prototype.forEach.call(document.querySelectorAll(".prev-group-toggle"), function(el){
      el.addEventListener("click", function(e){ e.stopPropagation(); toggleGroup(el.getAttribute("data-gi")); });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-group-row"), function(row){
      row.addEventListener("click", function(e){
        if(e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
        toggleGroup(row.getAttribute("data-gi"));
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-group-cat"), function(sel){
      sel.addEventListener("change", function(){
        var gi = parseInt(sel.getAttribute("data-gi"), 10);
        groups[gi].categoryId = sel.value;
        groups[gi].subcategoryId = "";
        sel.className = "prev-group-cat prev-category " + (sel.value ? "border-sage" : "border-clay");
        var subSel = document.querySelector('.prev-group-sub[data-gi="'+gi+'"]');
        if(sel.value && window.Ledger.categoryHasSubs && window.Ledger.categoryHasSubs(sel.value)){
          var cat = window.Ledger.findCategory(sel.value);
          if(cat && cat.subs && cat.subs.length){
            if(!subSel){
              subSel = document.createElement("select");
              subSel.className = "prev-group-sub";
              subSel.setAttribute("data-gi", gi);
              sel.parentElement.insertBefore(subSel, sel.nextSibling);
              if(window.Ledger.initCustomDropdowns) window.Ledger.initCustomDropdowns();
            }
            subSel.innerHTML = '<option value="">None</option>' + cat.subs.map(function(s){
              return '<option value="'+s.id+'">'+window.Ledger.escapeHtml(s.name)+'</option>';
            }).join("");
            return;
          }
        }
        if(subSel) subSel.innerHTML = '<option value="">None</option>';
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-group-sub"), function(sel){
      sel.addEventListener("change", function(){
        var gi = parseInt(sel.getAttribute("data-gi"), 10);
        groups[gi].subcategoryId = sel.value;
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-group-check"), function(chk){
      chk.addEventListener("change", function(){
        groups[parseInt(chk.getAttribute("data-gi"), 10)]._unchecked = !chk.checked;
      });
    });

    document.getElementById("confirmImportBtn").addEventListener("click", function(){
      var account = document.getElementById("prevAccount").value;
      if(!account){ window.Ledger.showToast("Choose an account"); return; }

      var imported = 0;
      var importedIds = [];
      var txArray = [];

      groups.forEach(function(g){
        if(g._unchecked) return;
        g.rows.forEach(function(item){
          var r = item.parsedRow;
          var chosenType = r._type;
          var chosenDesc = r.desc || "Imported transaction";
          var chosenCategory = g.categoryId || "";
          var chosenSubcategory = g.subcategoryId || "";

          if(chosenType === "transfer"){
            var newId = window.Ledger.uid();
            txArray.push({
              id: newId, type: "transfer", date: r.date, amount: Math.abs(r.amount),
              desc: chosenDesc, notes: "Imported from " + (source||"import"),
              account: account, category: chosenCategory, subcategory: chosenSubcategory, created: Date.now(),
              fromType: "account", fromId: account, pending: true
            });
            importedIds.push(newId);
          } else {
            var newId2 = window.Ledger.uid();
            txArray.push({
              id: newId2, type: chosenType, date: r.date, amount: Math.abs(r.amount),
              desc: chosenDesc, notes: "Imported from " + (source||"import"),
              account: account, category: chosenCategory, subcategory: chosenSubcategory, created: Date.now()
            });
            importedIds.push(newId2);
            if(chosenCategory){
              window.Ledger.learnCategory(chosenDesc, chosenCategory);
              if(chosenSubcategory) window.Ledger.learnSubcategory(chosenDesc, chosenCategory, chosenSubcategory);
            }
          }
          imported++;
        });
      });

      if(imported === 0){ window.Ledger.showToast("No rows checked"); return; }
      window.Ledger.addTransactionBatch(txArray);
      window.Ledger.closeModal();
      window.Ledger.closeModal();
      window.Ledger.showToast(imported + " transaction"+(imported===1?"":"s")+" imported");
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
      var d1 = new Date(t.date + "T00:00:00"), d2 = new Date(newTx.date + "T00:00:00");
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
          var existingIdx = window.Ledger.DB.transactions.findIndex(function(t){ return t.id === existingId; });
          if(existingIdx >= 0){
            window.Ledger.DB.transactions[existingIdx].amount = Math.max(Math.abs(existingTx.amount), Math.abs(newTx.amount));
            window.Ledger.DB.transactions[existingIdx].desc = existingTx.desc + " / " + newTx.desc;
          }
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
  var otherAccs = window.Ledger.DB.accounts.filter(function(a){ return a.id !== tx.fromId && !a.archived; });
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
      var changes = { toType: "account", toId: toAccountId, pending: false };
      if(newDesc) changes.desc = newDesc;
      window.Ledger.updateTransaction(tx.id, changes);
      window.Ledger.closeModal();
      window.Ledger.showToast("Transfer linked");
    });
  });
};

})();
