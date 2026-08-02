(function(){
window.Ledger = window.Ledger || {};

/* ---------- Transaction modal ---------- */
window.Ledger.openTxModal = function(existing){
  var isEdit = !!existing;
  var t = existing ? Object.assign({}, existing) : { type:"expense", date:window.Ledger.todayISO(), amount:"", desc:"", notes:"", account: (window.Ledger.DB.accounts[0]||{}).id, category:"", subcategory:"", fromType:"account", fromId:"", toType:"account", toId:"" };

  // If editing one half of a linked cross-currency transfer pair, reconstruct
  // a synthetic transfer view so the modal shows both legs correctly.
  var linkedToAmount = null;
  if(isEdit && t.linkId){
    var pairRows = window.Ledger.DB.transactions.filter(function(x){ return x.linkId === t.linkId; });
    var outRow = pairRows.find(function(x){ return x.linkRole === "out"; });
    var inRow = pairRows.find(function(x){ return x.linkRole === "in"; });
    if(outRow && inRow){
      t = {
        id: t.id, linkId: t.linkId, type: "transfer",
        date: outRow.date,
        amount: outRow.amount,
        desc: (outRow.desc||"").split(" \u2192 ")[0] || "Transfer",
        notes: outRow.notes || "",
        fromType: "account", fromId: outRow.account,
        toType: "account", toId: inRow.account,
        category: outRow.category || "",
        subcategory: outRow.subcategory || "",
        created: outRow.created
      };
      linkedToAmount = inRow.amount;
    }
  }

  var accOptsAll = window.Ledger.DB.accounts.filter(function(a){ return !a.archived; }).map(function(a){ return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+' ('+a.currency+')</option>'; }).join("");
  var peopleOpts = window.Ledger.DB.people.map(function(p){ return '<option value="'+p.id+'">'+window.Ledger.escapeHtml(p.name)+' ('+p.currency+')</option>'; }).join("");

  function catOptions(forType){
    var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === forType; });
    if(relevant.length === 0){
      return '<option value="">No category</option>';
    }
    return '<option value="">No category</option>' + relevant.map(function(c){
      return '<option value="'+c.id+'" '+(t.category===c.id?'selected':'')+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }

  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit transaction':'New transaction') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="type-pills" id="typePills">'
    + '    <button type="button" class="type-pill ' + (t.type==='expense'?'active':'') + '" data-t="expense">\u2212 Expense</button>'
    + '    <button type="button" class="type-pill ' + (t.type==='income'?'active':'') + '" data-t="income">+ Income</button>'
    + '    <button type="button" class="type-pill ' + (t.type==='transfer'?'active':'') + '" data-t="transfer">\u21c4 Transfer</button>'
    + '    <button type="button" class="type-pill ' + (t.type==='refund'?'active':'') + '" data-t="refund">\u21bb Refund</button>'
    + '  </div>'
    + '  <div class="field"><label>Description <span class="faint">(optional)</span></label><input type="text" id="txDesc" value="' + window.Ledger.escapeHtml(t.desc||"") + '" placeholder="e.g. Groceries at Metro"><div id="catSuggestions" class="cat-suggestions"></div></div>'
    + '  <div class="form-row">'
    + '    <div class="field"><label>Amount</label><input type="number" id="txAmount" step="0.01" min="0.01" value="' + (t.amount||"") + '"></div>'
    + '    <div class="field"><label>Date</label><input type="date" id="txDate" value="' + t.date + '" data-max="today"></div>'
    + '  </div>'
    + '  <div id="exIncFields" class="tx-section' + (t.type==='transfer'?' tx-hidden':'') + '">'
    + '    <div class="form-row">'
    + '      <div class="field"><label id="txAccountLabel">' + (t.type==='refund'?'Refund to account':'Account') + '</label><select id="txAccount">' + accOptsAll + '</select></div>'
    + '      <div class="field"><label>Category</label><select id="txCategory">' + catOptions(t.type==='income'?'income':'expense') + '</select></div>'
    + '    </div>'
    + '    <div class="field" id="subcatField" style="display:none;"><label>Subcategory <span class="faint">(optional)</span></label><select id="txSubcategory"></select></div>'
    + '    <div id="refundPickerField" style="display:' + (t.type==='refund'?'flex':'none') + '; flex-direction:column; gap:8px;">'
    + '      <label>Select original transaction <span class="faint">(optional &mdash; or pick a category below)</span></label>'
    + '      <input type="text" id="refundSearch" placeholder="Search by description, date, amount, or account..." style="font-size:13px; padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:var(--surface); color:var(--text);">'
    + '      <div id="refundResults" style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius);"></div>'
    + '      <div id="refundSelected" style="display:none; font-size:12px; color:var(--sage); padding:6px 0;"></div>'
    + '    </div>'
    + (t.type !== 'income' && t.type !== 'refund' ? (
        '    <div style="display:flex; gap:16px; padding-top:2px;">'
        + '      <button type="button" id="openCategorySplitBtn" class="icon-btn" style="font-size:11.5px; font-weight:700; color:var(--brass); padding:2px 0;">&#8862; Split across categories</button>'
        + '      <button type="button" id="openFriendSplitBtn" class="icon-btn" style="font-size:11.5px; font-weight:700; color:var(--brass); padding:2px 0;">&#128101; Split with friends</button>'
        + '    </div>'
        + '    <div id="splitSummaryBanner" style="display:none; background:var(--brass-soft); border:1px solid var(--brass-glow-color); border-radius:var(--radius); padding:10px 14px; font-size:12px;"></div>'
      ) : '')
    + '  </div>'
    + '  <div id="transferFields" class="tx-section' + (t.type==='transfer'?'':' tx-hidden') + '">'
    + '    <div class="form-row">'
    + '      <div class="field"><label>From</label><select id="txFromType"><option value="account">Account</option><option value="person">Person</option></select></div>'
    + '      <div class="field"><label>&nbsp;</label><select id="txFromId">' + accOptsAll + '</select></div>'
    + '    </div>'
    + '    <div class="form-row">'
    + '      <div class="field"><label>To</label><select id="txToType"><option value="account">Account</option><option value="person">Person</option></select></div>'
    + '      <div class="field"><label>&nbsp;</label><select id="txToId">' + accOptsAll + '</select></div>'
    + '    </div>'
    + '    <div class="form-row">'
    + '      <div class="field"><label>Category</label><select id="txTransferCategory">' + catOptions("transfer") + '</select></div>'
    + '    </div>'
    + '    <div class="field" id="transferSubcatField" style="display:none;"><label>Subcategory <span class="faint">(optional)</span></label><select id="txTransferSubcategory"></select></div>'
    + '    <div id="conversionField" class="field" style="display:none;">'
    + '      <label>Amount received <span class="faint" id="conversionCurLabel"></span></label>'
    + '      <input type="number" id="txConvertedAmount" step="0.01" min="0.01" placeholder="0.00">'
    + '      <p class="faint" style="font-size:11px; margin:4px 0 0;">Different currencies detected &mdash; enter what actually landed in the destination account after conversion.</p>'
    + '    </div>'
    + '    <p class="faint" style="font-size:11.5px; margin:0;">Tip: paying a credit card bill is a transfer from your bank account to the card. Lending money is a transfer from an account to a person.</p>'
    + '  </div>'
    + '  <div class="field"><label>Notes <span class="faint">(optional)</span></label><textarea id="txNotes">' + window.Ledger.escapeHtml(t.notes||"") + '</textarea></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelTxBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveTxBtn">' + (isEdit?'Save changes':'Add to ledger') + '</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    var currentType = t.type;
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelTxBtn").addEventListener("click", window.Ledger.closeModal);

    if(t.account) document.getElementById("txAccount").value = t.account;

    function renderCatSuggestions(){
      var desc = document.getElementById("txDesc").value.trim();
      var sugBox = document.getElementById("catSuggestions");
      if(!sugBox) return;
      if(currentType === "transfer" || !desc || desc.length < 2){ sugBox.innerHTML = ""; return; }
      var catType = currentType === "refund" ? "expense" : currentType;
      var suggestions = window.Ledger.rankCategorySuggestions(desc, catType, window.Ledger.DB, window.Ledger.findCategory);
      if(suggestions.length === 0){ sugBox.innerHTML = ""; return; }
      var currentCatId = document.getElementById("txCategory").value;
      sugBox.innerHTML = '<span class="cat-sug-label">Suggested:</span>' + suggestions.map(function(s){
        return '<button type="button" class="cat-sug-pill' + (s.id === currentCatId ? ' active' : '') + '" data-catid="' + s.id + '" data-subid="' + (s.subcategoryId || "") + '">' + window.Ledger.escapeHtml(s.name) + '</button>';
      }).join("");
      Array.prototype.forEach.call(sugBox.querySelectorAll(".cat-sug-pill"), function(pill){
        pill.addEventListener("click", function(){
          var catId = pill.getAttribute("data-catid");
          var subId = pill.getAttribute("data-subid") || "";
          var catSel = document.getElementById("txCategory");
          catSel.value = catId;
          window.Ledger.refreshCustomDropdown(catSel);
          refreshSubcatOptions();
          if(subId){
            var subSel = document.getElementById("txSubcategory");
            if(subSel){
              subSel.value = subId;
              window.Ledger.refreshCustomDropdown(subSel);
            }
          }
          renderCatSuggestions();
        });
      });
    }
    var txDescEl = document.getElementById("txDesc");
    if(txDescEl) txDescEl.addEventListener("input", renderCatSuggestions);

    function refreshSubcatOptions(){
      var catId = document.getElementById("txCategory").value;
      var subField = document.getElementById("subcatField");
      var subSel = document.getElementById("txSubcategory");
      if(catId && window.Ledger.categoryHasSubs(catId)){
        var cat = window.Ledger.findCategory(catId);
        subSel.innerHTML = cat.subs.map(function(s){
          return '<option value="'+s.id+'" '+(t.subcategory===s.id?'selected':'')+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
        }).join("");
        subField.style.display = "flex";
      } else {
        subField.style.display = "none";
        subSel.innerHTML = "";
      }
      window.Ledger.refreshCustomDropdown(subSel);
    }
    document.getElementById("txCategory").addEventListener("change", refreshSubcatOptions);
    refreshSubcatOptions();

    function refreshTransferSubcatOptions(){
      var catId = document.getElementById("txTransferCategory").value;
      var subField = document.getElementById("transferSubcatField");
      var subSel = document.getElementById("txTransferSubcategory");
      if(catId && window.Ledger.categoryHasSubs(catId)){
        var cat = window.Ledger.findCategory(catId);
        subSel.innerHTML = cat.subs.map(function(s){
          return '<option value="'+s.id+'" '+(t.subcategory===s.id?'selected':'')+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
        }).join("");
        subField.style.display = "flex";
      } else {
        subField.style.display = "none";
        subSel.innerHTML = "";
      }
      window.Ledger.refreshCustomDropdown(subSel);
    }
    document.getElementById("txTransferCategory").addEventListener("change", refreshTransferSubcatOptions);
    refreshTransferSubcatOptions();

    Array.prototype.forEach.call(document.querySelectorAll("#typePills .type-pill"), function(btn){
      btn.addEventListener("click", function(){
        currentType = btn.getAttribute("data-t");
        Array.prototype.forEach.call(document.querySelectorAll("#typePills .type-pill"), function(b){ b.classList.toggle("active", b===btn); });
        document.getElementById("exIncFields").classList.toggle("tx-hidden", currentType === "transfer");
        document.getElementById("transferFields").classList.toggle("tx-hidden", currentType !== "transfer");
        if(currentType === "expense" || currentType === "income" || currentType === "refund"){
          var catSel = document.getElementById("txCategory");
          catSel.innerHTML = catOptions(currentType === "refund" ? "expense" : currentType);
          window.Ledger.refreshCustomDropdown(catSel);
          refreshSubcatOptions();
        }
        if(currentType === "transfer"){
          var transferCatSel = document.getElementById("txTransferCategory");
          if(transferCatSel){ transferCatSel.innerHTML = catOptions("transfer"); window.Ledger.refreshCustomDropdown(transferCatSel); refreshTransferSubcatOptions(); }
        }
        // Hide split buttons for refund (not applicable)
        var splitBtns = document.getElementById("openCategorySplitBtn");
        if(splitBtns) splitBtns.closest("div").style.display = (currentType === "refund" || currentType === "income") ? "none" : "flex";
        // Show/hide refund picker
        var refundPicker = document.getElementById("refundPickerField");
        if(refundPicker) refundPicker.style.display = currentType === "refund" ? "flex" : "none";
        // Update account label for refund
        var accLabel = document.getElementById("txAccountLabel");
        if(accLabel) accLabel.textContent = currentType === "refund" ? "Refund to account" : "Account";
        if(currentType === "refund"){ refundOf = null; renderRefundResults(); }
        else { refundOf = null; }
        renderCatSuggestions();
      });
    });

    function refreshEntitySelect(typeSelId, idSelId){
      var kind = document.getElementById(typeSelId).value;
      var sel = document.getElementById(idSelId);
      sel.innerHTML = kind === "account" ? accOptsAll : peopleOpts;
      window.Ledger.refreshCustomDropdown(sel);
    }
    function checkCurrencyMismatch(){
      var fromType = document.getElementById("txFromType").value;
      var fromId = document.getElementById("txFromId").value;
      var toType = document.getElementById("txToType").value;
      var toId = document.getElementById("txToId").value;
      var fromRef = fromId ? window.Ledger.entityRef(fromType, fromId) : null;
      var toRef = toId ? window.Ledger.entityRef(toType, toId) : null;
      // A person has no fixed currency of their own, so a transfer involving a
      // person never triggers the cross-currency conversion field.
      var mismatch = fromRef && toRef && fromRef.currency && toRef.currency && fromRef.currency !== toRef.currency;
      var field = document.getElementById("conversionField");
      if(mismatch){
        field.style.display = "block";
        document.getElementById("conversionCurLabel").textContent = "(in " + toRef.currency + ")";
      } else {
        field.style.display = "none";
      }
    }
    ["txFromType","txToType"].forEach(function(selId){
      document.getElementById(selId).addEventListener("change", function(){
        refreshEntitySelect(selId, selId.replace("Type","Id"));
        checkCurrencyMismatch();
      });
    });
    document.getElementById("txFromId").addEventListener("change", checkCurrencyMismatch);
    document.getElementById("txToId").addEventListener("change", checkCurrencyMismatch);
    if(isEdit && t.type === "transfer"){
      document.getElementById("txFromType").value = t.fromType;
      window.Ledger.refreshCustomDropdown(document.getElementById("txFromType"));
      refreshEntitySelect("txFromType","txFromId");
      document.getElementById("txFromId").value = t.fromId;
      window.Ledger.refreshCustomDropdown(document.getElementById("txFromId"));
      document.getElementById("txToType").value = t.toType;
      window.Ledger.refreshCustomDropdown(document.getElementById("txToType"));
      refreshEntitySelect("txToType","txToId");
      document.getElementById("txToId").value = t.toId;
      window.Ledger.refreshCustomDropdown(document.getElementById("txToId"));
      checkCurrencyMismatch();
      if(linkedToAmount != null){
        document.getElementById("txConvertedAmount").value = linkedToAmount;
      }
    }
    // Initial check for a fresh transfer form (default From/To selections)
    setTimeout(checkCurrencyMismatch, 0);

    // ---- Split state (category split and friend split are mutually exclusive per transaction) ----
    var categorySplits = (isEdit && t.categorySplits) ? t.categorySplits.slice() : null;
    var friendSplit = (isEdit && t.friendSplit) ? Object.assign({}, t.friendSplit) : null;

    function refreshSplitBanner(){
      var banner = document.getElementById("splitSummaryBanner");
      if(!banner) return;
      if(categorySplits && categorySplits.length){
        var lines = categorySplits.map(function(s){ return window.Ledger.categoryName(s.categoryId) + ": " + window.Ledger.fmtMoney(s.amount); }).join(" &middot; ");
        banner.style.display = "block";
        banner.innerHTML = "<b>Split across " + categorySplits.length + " categories</b> &mdash; " + lines + ' &nbsp; <button type="button" id="clearSplitBtn" class="icon-btn" style="color:var(--clay);">Remove split</button>';
        document.getElementById("txCategory").closest(".form-row").style.opacity = "0.4";
        document.getElementById("txCategory").disabled = true;
      } else if(friendSplit && friendSplit.shares && friendSplit.shares.length){
        var names = friendSplit.shares.map(function(s){
          var label = s.personId ? (window.Ledger.findPerson(s.personId)||{}).name : "Unassigned";
          return (label||"Unassigned") + ": " + window.Ledger.fmtMoney(s.amount);
        }).join(" &middot; ");
        banner.style.display = "block";
        banner.innerHTML = "<b>Split with friends</b> &mdash; your share " + window.Ledger.fmtMoney(friendSplit.yourShare) + " &middot; " + names + ' &nbsp; <button type="button" id="clearSplitBtn" class="icon-btn" style="color:var(--clay);">Remove split</button>';
      } else {
        banner.style.display = "none";
        banner.innerHTML = "";
        var catRow = document.getElementById("txCategory");
        if(catRow){ catRow.closest(".form-row").style.opacity = "1"; catRow.disabled = false; }
      }
      var clearBtn = document.getElementById("clearSplitBtn");
      if(clearBtn){
        clearBtn.addEventListener("click", function(){
          categorySplits = null; friendSplit = null; refreshSplitBanner();
        });
      }
    }
    refreshSplitBanner();

    var catBtn = document.getElementById("openCategorySplitBtn");
    if(catBtn) catBtn.addEventListener("click", function(){
      var amt = parseFloat(document.getElementById("txAmount").value);
      if(!amt || amt <= 0){ window.Ledger.showToast("Enter an amount first"); return; }
      window.Ledger.openCategorySplitModal(amt, categorySplits, currentType, function(splits){
        categorySplits = splits;
        friendSplit = null;
        refreshSplitBanner();
      });
    });
    var friendBtn = document.getElementById("openFriendSplitBtn");
    if(friendBtn) friendBtn.addEventListener("click", function(){
      var amt = parseFloat(document.getElementById("txAmount").value);
      if(!amt || amt <= 0){ window.Ledger.showToast("Enter an amount first"); return; }
      window.Ledger.openFriendSplitModal(amt, friendSplit, function(result){
        friendSplit = result;
        categorySplits = null;
        refreshSplitBanner();
      });
    });

    // ---- Refund picker: link to original transaction ----
    var refundOf = (isEdit && t.refundOf) ? t.refundOf : null;

    function getRefundCandidates(){
      var amt = parseFloat(document.getElementById("txAmount").value);
      var searchEl = document.getElementById("refundSearch");
      var q = searchEl ? searchEl.value.trim().toLowerCase() : "";

      // Build set of already-refunded transaction IDs
      var refundedIds = {};
      window.Ledger.DB.transactions.forEach(function(tx){
        if(tx.type === "refund" && tx.refundOf) refundedIds[tx.refundOf] = true;
      });

      var allExpenses = window.Ledger.DB.transactions.filter(function(tx){
        if(tx.type !== "expense") return false;
        // Limit to last 6 months for relevance/performance
        var sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        var cutoff = sixMonthsAgo.getFullYear() + "-" + String(sixMonthsAgo.getMonth()+1).padStart(2,"0") + "-" + String(sixMonthsAgo.getDate()).padStart(2,"0");
        if(tx.date < cutoff) return false;
        if(q){
          var desc = (tx.desc || "").toLowerCase();
          var date = tx.date || "";
          var amtStr = String(tx.amount);
          var acc = window.Ledger.findAccount(tx.account);
          var accName = acc ? acc.name.toLowerCase() : "";
          if(desc.indexOf(q) === -1 && date.indexOf(q) === -1 && amtStr.indexOf(q) === -1 && accName.indexOf(q) === -1) return false;
        }
        return true;
      });

      allExpenses.sort(function(a, b){
        // Score: amount match (100 pts) + description overlap (up to 50 pts) + recency (up to 10 pts)
        function score(tx){
          var s = 0;
          if(amt && Math.abs(tx.amount - amt) < 0.005) s += 100;
          // Description word overlap with refund description
          var refundDesc = (q || "").toLowerCase();
          var txDesc = (tx.desc || "").toLowerCase();
          if(refundDesc && txDesc){
            var rWords = refundDesc.split(/\s+/).filter(function(w){ return w.length > 2; });
            var tWords = txDesc.split(/\s+/).filter(function(w){ return w.length > 2; });
            var overlap = 0;
            rWords.forEach(function(w){ if(tWords.indexOf(w) !== -1) overlap++; });
            if(rWords.length > 0) s += Math.round((overlap / rWords.length) * 50);
          }
          // Recency bonus (up to 10 pts for this month)
          var d = new Date(tx.date + "T00:00:00");
          var now = new Date();
          var monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
          if(monthsAgo <= 1) s += 10; else if(monthsAgo <= 3) s += 5;
          return s;
        }
        var aScore = score(a);
        var bScore = score(b);
        if(bScore !== aScore) return bScore - aScore;
        return b.date.localeCompare(a.date);
      });

      var suggested = allExpenses.filter(function(tx){ return !refundedIds[tx.id]; });
      return { suggested: suggested.slice(0, 10), all: allExpenses.slice(0, 30) };
    }

    function renderRefundResultItem(tx, showOrigAcc){
      var acc = window.Ledger.findAccount(tx.account);
      var catName = window.Ledger.categoryName(tx.category);
      var isSel = refundOf === tx.id;
      var amt = parseFloat(document.getElementById("txAmount").value) || 0;
      var isAmtMatch = amt > 0 && Math.abs(tx.amount - amt) < 0.005;
      var cur = acc ? acc.currency : "USD";
      var isRefunded = window.Ledger.DB.transactions.some(function(x){ return x.type === "refund" && x.refundOf === tx.id && x.id !== refundOf; });
      return '<div class="refund-result" data-txid="' + tx.id + '" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid var(--border-soft); font-size:12px; display:flex; justify-content:space-between; align-items:center;' + (isSel ? ' background:var(--sage-soft);' : '') + (isAmtMatch && !isSel ? ' border-left:3px solid var(--sage);' : '') + (isRefunded ? ' opacity:0.5;' : '') + '">'
        + '<div>'
        + '  <div style="font-weight:600;">' + window.Ledger.escapeHtml(tx.desc || "Transaction") + (isRefunded ? ' <span style="color:var(--sage); font-size:10px;">(already refunded)</span>' : '') + '</div>'
        + '  <div style="color:var(--text-faint); font-size:11px;">' + tx.date + ' \u00b7 ' + window.Ledger.escapeHtml(acc ? acc.name : "?") + ' \u00b7 ' + window.Ledger.escapeHtml(catName) + '</div>'
        + '</div>'
        + '<div style="font-weight:700; font-variant-numeric:tabular-nums; white-space:nowrap;">' + window.Ledger.fmtMoney(tx.amount, cur) + '</div>'
        + '</div>';
    }

    function renderRefundResults(){
      var candidates = getRefundCandidates();
      var container = document.getElementById("refundResults");
      if(!container) return;

      var hasSuggested = candidates.suggested.length > 0;
      var hasAll = candidates.all.length > 0;

      if(!hasSuggested && !hasAll){
        container.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--text-faint);">No matching expenses</div>';
        return;
      }

      var html = "";
      if(hasSuggested){
        html += '<div style="padding:6px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--sage); background:var(--sage-soft); border-bottom:1px solid var(--border-soft);">Suggested &mdash; not yet refunded</div>';
        html += candidates.suggested.map(function(tx){ return renderRefundResultItem(tx, true); }).join("");
      }
      if(hasAll){
        if(hasSuggested){
          html += '<div style="padding:6px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text-faint); background:var(--surface-2); border-bottom:1px solid var(--border-soft);">All expenses</div>';
        }
        html += candidates.all.map(function(tx){ return renderRefundResultItem(tx, true); }).join("");
      }

      container.innerHTML = html;
      Array.prototype.forEach.call(container.querySelectorAll(".refund-result"), function(el){
        el.addEventListener("click", function(){
          refundOf = el.getAttribute("data-txid");
          var tx = window.Ledger.DB.transactions.find(function(x){ return x.id === refundOf; });
          if(tx){
            var catSel = document.getElementById("txCategory");
            if(catSel && tx.category){ catSel.value = tx.category; catSel.dispatchEvent(new Event("change")); }
            var confirmEl = document.getElementById("refundSelected");
            if(confirmEl){
              var origAcc = window.Ledger.findAccount(tx.account);
              var refundAccSel = document.getElementById("txAccount");
              var refundAccName = "";
              if(refundAccSel){
                var refundAcc = window.Ledger.findAccount(refundAccSel.value);
                refundAccName = refundAcc ? refundAcc.name : "";
              }
              var isCrossAccount = origAcc && refundAccName && origAcc.name !== refundAccName;
              confirmEl.style.display = "block";
              confirmEl.innerHTML = 'Linked to: <b>' + window.Ledger.escapeHtml(tx.desc || "Transaction") + '</b> ('
                + tx.date + ', ' + window.Ledger.fmtMoney(tx.amount, origAcc ? origAcc.currency : "USD")
                + (isCrossAccount ? ') &mdash; paid with <b>' + window.Ledger.escapeHtml(origAcc.name) + '</b>, refund to <b>' + window.Ledger.escapeHtml(refundAccName) + '</b>' : ')');
            }
          }
          renderRefundResults();
        });
      });
    }

    var refundSearchEl = document.getElementById("refundSearch");
    if(refundSearchEl) refundSearchEl.addEventListener("input", renderRefundResults);
    var amtInput = document.getElementById("txAmount");
    if(amtInput) amtInput.addEventListener("input", function(){
      var picker = document.getElementById("refundPickerField");
      if(picker && picker.style.display !== "none") renderRefundResults();
    });
    // Re-render when refund account changes (to update cross-account display)
    var refundAccSel = document.getElementById("txAccount");
    if(refundAccSel) refundAccSel.addEventListener("change", function(){
      var picker = document.getElementById("refundPickerField");
      if(picker && picker.style.display !== "none" && refundOf) renderRefundResults();
    });
    if(currentType === "refund") renderRefundResults();
    if(refundOf){
      var origTx = window.Ledger.DB.transactions.find(function(x){ return x.id === refundOf; });
      if(origTx){
        var ce = document.getElementById("refundSelected");
        if(ce){
          var oAcc = window.Ledger.findAccount(origTx.account);
          var rAccSel2 = document.getElementById("txAccount");
          var rAccName2 = "";
          if(rAccSel2){ var rA2 = window.Ledger.findAccount(rAccSel2.value); rAccName2 = rA2 ? rA2.name : ""; }
          var isCross2 = oAcc && rAccName2 && oAcc.name !== rAccName2;
          ce.style.display = "block";
          ce.innerHTML = 'Linked to: <b>' + window.Ledger.escapeHtml(origTx.desc || "Transaction") + '</b> ('
            + origTx.date + ', ' + window.Ledger.fmtMoney(origTx.amount, oAcc ? oAcc.currency : "USD")
            + (isCross2 ? ') &mdash; paid with <b>' + window.Ledger.escapeHtml(oAcc.name) + '</b>, refund to <b>' + window.Ledger.escapeHtml(rAccName2) + '</b>' : ')');
        }
      }
    }

    document.getElementById("saveTxBtn").addEventListener("click", function(){
      var desc = document.getElementById("txDesc").value.trim();
      var amount = parseFloat(document.getElementById("txAmount").value);
      var date = document.getElementById("txDate").value;
      var notes = document.getElementById("txNotes").value.trim();

      if(!amount || amount <= 0 || isNaN(amount) || !isFinite(amount)){ window.Ledger.showToast("Enter a valid amount"); return; }
      if(!date){ window.Ledger.showToast("Pick a date"); return; }

      if(currentType === "transfer"){
        var fromType = document.getElementById("txFromType").value;
        var fromId = document.getElementById("txFromId").value;
        var toType = document.getElementById("txToType").value;
        var toId = document.getElementById("txToId").value;
        if(!fromId || !toId){ window.Ledger.showToast("Select both From and To"); return; }
        if(fromType===toType && fromId===toId){ window.Ledger.showToast("From and To must be different"); return; }
        var fromCur = window.Ledger.entityRef(fromType, fromId), toCur = window.Ledger.entityRef(toType, toId);
        var isCrossCurrency = fromCur && toCur && fromCur.currency && toCur.currency && fromCur.currency !== toCur.currency;

        if(isCrossCurrency){
          var convertedAmount = parseFloat(document.getElementById("txConvertedAmount").value);
          if(!convertedAmount || convertedAmount <= 0 || isNaN(convertedAmount)){
            window.Ledger.showToast("Enter the amount received in " + toCur.currency);
            return;
          }
          var txCat = document.getElementById("txTransferCategory").value || "";
          var txSub = "";
          if(txCat && window.Ledger.categoryHasSubs(txCat)){
            txSub = document.getElementById("txTransferSubcategory").value || "";
          }
          if(isEdit && t.linkId){
            window.Ledger.commitLinkedTransferPair(t.linkId, date, amount, convertedAmount, desc, notes, fromType, fromId, toType, toId, t.created, txCat, txSub);
          } else {
            window.Ledger.commitLinkedTransferPair(window.Ledger.uid(), date, amount, convertedAmount, desc, notes, fromType, fromId, toType, toId, Date.now(), txCat, txSub);
          }
          if(!isEdit && desc && txCat){
            window.Ledger.learnCategory(desc, txCat);
            if(txSub) window.Ledger.learnSubcategory(desc, txCat, txSub);
          }
          window.Ledger.closeModal();
          window.Ledger.showToast("Cross-currency transfer saved");
          return;
        }

        var txCat = document.getElementById("txTransferCategory").value || "";
        var txSub = "";
        if(txCat && window.Ledger.categoryHasSubs(txCat)){
          txSub = document.getElementById("txTransferSubcategory").value || "";
        }
        var rec = {
          id: isEdit ? t.id : window.Ledger.uid(), type:"transfer", date:date, amount:amount,
          desc: desc || "Transfer", notes:notes,
          fromType:fromType, fromId:fromId, toType:toType, toId:toId,
          category: txCat, subcategory: txSub,
          created: isEdit ? t.created : Date.now()
        };
        if(isEdit && t.linkId){ window.Ledger.deleteTransactionsByLink(t.linkId); }
        if(!isEdit && desc && txCat){
          window.Ledger.learnCategory(desc, txCat);
          if(txSub) window.Ledger.learnSubcategory(desc, txCat, txSub);
        }
        window.Ledger.commitTransaction(rec, isEdit);
        window.Ledger.closeModal();
        window.Ledger.showToast(isEdit ? "Transaction updated" : "Transaction added");
      } else {
        var account = document.getElementById("txAccount").value;
        if(!account){ window.Ledger.showToast("Select an account"); return; }

        // ---- Friend split: your share is a normal expense + debt items per friend ----
        if(friendSplit && friendSplit.shares && friendSplit.shares.length){
          var fCategory = document.getElementById("txCategory").value;
          if(!fCategory){ window.Ledger.showToast("Select a category for your share"); return; }
          var fSub = "";
          if(fCategory && window.Ledger.categoryHasSubs(fCategory)){
            fSub = document.getElementById("txSubcategory").value;
            if(!fSub){ window.Ledger.showToast("This category requires a subcategory"); return; }
          }
          var yourDesc = desc || (window.Ledger.categoryName(fCategory) + " (split)");
          var mainId = isEdit ? t.id : window.Ledger.uid();
          var mainRec = {
            id: mainId, type:"expense", date:date, amount: friendSplit.yourShare,
            desc: yourDesc, notes:notes, account:account, category:fCategory, subcategory:fSub,
            friendSplit: { yourShare: friendSplit.yourShare, shares: friendSplit.shares },
            created: isEdit ? t.created : Date.now()
          };
          if(isEdit){
            window.Ledger.upsertTransaction(mainRec);
            window.Ledger.replaceDebtItemsForTransaction(mainId, [], true);
          } else {
            window.Ledger.addTransaction(mainRec, true);
            window.Ledger.learnCategory(yourDesc, fCategory);
            if(fSub) window.Ledger.learnSubcategory(yourDesc, fCategory, fSub);
          }
          friendSplit.shares.forEach(function(share){
            window.Ledger.DB.debtItems.push({
              id: window.Ledger.uid(),
              sourceTransactionId: mainId,
              personId: share.personId || null,
              description: yourDesc,
              amount: share.amount,
              currency: (window.Ledger.findAccount(account)||{}).currency || "USD",
              status: share.personId ? "open" : "pending",
              date: date,
              created: Date.now()
            });
          });
          window.Ledger.saveData();
          window.Ledger.closeModal();
          window.Ledger.showToast("Expense split saved (" + friendSplit.shares.length + " share" + (friendSplit.shares.length===1?"":"s") + " tracked)");
          window.Ledger.renderPage();
          return;
        }

        var category = document.getElementById("txCategory").value;
        var subcategory = "";
        if(category && window.Ledger.categoryHasSubs(category)){
          subcategory = document.getElementById("txSubcategory").value;
        }

        // ---- Category split: one transaction, multiple category allocations ----
        if(categorySplits && categorySplits.length){
          var splitDesc = desc || "Split purchase";
          var rec3 = {
            id: isEdit ? t.id : window.Ledger.uid(), type:currentType, date:date, amount:amount,
            desc: splitDesc, notes:notes, account:account, category:"", subcategory:"",
            categorySplits: categorySplits,
            created: isEdit ? t.created : Date.now()
          };
          window.Ledger.commitTransaction(rec3, isEdit);
          window.Ledger.closeModal();
          window.Ledger.showToast(isEdit ? "Transaction updated" : "Transaction added");
          return;
        }

        var fallbackDesc = window.Ledger.categoryName(category) + (subcategory ? " \u2014 " + window.Ledger.subcatName(category, subcategory) : "");
        var rec2 = {
          id: isEdit ? t.id : window.Ledger.uid(), type:currentType, date:date, amount:amount,
          desc: desc || fallbackDesc, notes:notes, account:account, category:category, subcategory:subcategory,
          created: isEdit ? t.created : Date.now()
        };
        if(currentType === "refund" && refundOf) rec2.refundOf = refundOf;
        if(!isEdit && desc && category){
          window.Ledger.learnCategory(desc, category);
          if(subcategory) window.Ledger.learnSubcategory(desc, category, subcategory);
        }
        window.Ledger.commitTransaction(rec2, isEdit);
        window.Ledger.closeModal();
        window.Ledger.showToast(isEdit ? "Transaction updated" : "Transaction added");
      }
    });
  });
};

window.Ledger.commitTransaction = function(rec){
  window.Ledger.upsertTransaction(rec);
};

/* Cross-currency transfer between own accounts/people: creates two linked rows
   (an expense on the From side, an income on the To side) sharing a linkId,
    so filters/transactions/currency totals all work correctly per-account. */
window.Ledger.commitLinkedTransferPair = function(linkId, date, fromAmount, toAmount, desc, notes, fromType, fromId, toType, toId, createdTs, category, subcategory){
  var fromRef = window.Ledger.entityRef(fromType, fromId);
  var toRef = window.Ledger.entityRef(toType, toId);
  var baseDesc = desc || "Transfer";
  category = category || "";
  subcategory = subcategory || "";

  var rows = [];
  if(fromType === "account"){
    rows.push({
      id: window.Ledger.uid(), type: "expense", date: date, amount: fromAmount,
      desc: baseDesc + " \u2192 " + (toRef ? toRef.name : "?"),
      notes: notes, account: (fromType==="account" ? fromId : null),
      person: (fromType==="person" ? fromId : null),
      category: category, subcategory: subcategory,
      linkId: linkId, linkRole: "out", linkCurrency: toRef ? toRef.currency : "",
      created: createdTs
    });
  }
  if(toType === "account"){
    rows.push({
      id: window.Ledger.uid(), type: "income", date: date, amount: toAmount,
      desc: baseDesc + " \u2190 " + (fromRef ? fromRef.name : "?"),
      notes: notes, account: (toType==="account" ? toId : null),
      person: (toType==="person" ? toId : null),
      category: category, subcategory: subcategory,
      linkId: linkId, linkRole: "in", linkCurrency: fromRef ? fromRef.currency : "",
      created: createdTs
    });
  }

  window.Ledger.deleteTransactionsByLink(linkId);
  window.Ledger.addTransactionBatch(rows);
};

})();