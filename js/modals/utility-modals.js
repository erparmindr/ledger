(function(){
window.Ledger = window.Ledger || {};

/* ---------- Duplicate transactions modal ---------- */
window.Ledger.openDuplicatesModal = function(){
  var groups = window.Ledger.findAllDuplicates();
  if(groups.length === 0){
    window.Ledger.openModal(
      '<div class="modal-head"><h3>Duplicate check</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      + '<div class="modal-body"><div class="dupe-empty"><div class="dupe-empty-icon">\u2713</div><div class="dupe-empty-msg">No duplicate transactions found</div><div class="dupe-empty-hint">All transactions look unique based on amount, date, description, type, and account.</div></div></div>'
      + '<div class="modal-foot"><button class="btn btn-primary" id="doneBtn">Done</button></div>',
      function(){
        document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
        document.getElementById("doneBtn").addEventListener("click", window.Ledger.closeModal);
      }
    );
    return;
  }

  var totalDupes = 0;
  groups.forEach(function(g){ totalDupes += g.length; });

  var groupsHtml = groups.map(function(g, gi){
    var rows = g.map(function(t){
      var acct = window.Ledger.findAccount(t.account);
      var cat = window.Ledger.findCategory(t.category);
      var desc = window.Ledger.escapeHtml(t.desc || "Untitled");
      return '<div class="dupe-row" data-dupe-tx="' + t.id + '">'
        + '<label class="dupe-check"><input type="checkbox" class="dupe-cb" data-dupe-cb="' + t.id + '" data-group="' + gi + '"><span class="dupe-check-mark"></span></label>'
        + '<span class="dupe-row-date">' + t.date + '</span>'
        + '<span class="dupe-row-desc">' + desc + '</span>'
        + '<span class="dupe-row-cat">' + (cat ? cat.name : '') + '</span>'
        + '<span class="dupe-row-acct">' + (acct ? acct.name : '') + '</span>'
        + '<span class="dupe-row-amt num">' + window.Ledger.fmtMoney(t.amount, acct ? acct.currency : null) + '</span>'
        + '<span class="dupe-row-actions">'
        + '  <button class="icon-btn sm" data-dupe-view="' + t.id + '" title="View"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>'
        + '</span>'
        + '</div>';
    }).join("");
    return '<div class="dupe-group">'
      + '<div class="dupe-group-header">'
      + '  <label class="dupe-check"><input type="checkbox" class="dupe-group-cb" data-group="' + gi + '"><span class="dupe-check-mark"></span> Group ' + (gi+1) + '</label>'
      + '  <span class="dupe-group-count">' + g.length + ' transaction' + (g.length !== 1 ? 's' : '') + '</span>'
      + '</div>'
      + rows
      + '</div>';
  }).join("");

  var html = ''
    + '<div class="modal-head"><h3>Duplicates found</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="dupe-summary">' + groups.length + ' group' + (groups.length!==1?'s':'') + ' \u2014 ' + totalDupes + ' transaction' + (totalDupes!==1?'s':'') + ' total</div>'
    + '  <div class="dupe-groups">' + groupsHtml + '</div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <span class="dupe-sel-count" id="dupeSelCount">0 selected</span>'
    + '  <button class="btn" id="doneBtn">Done</button>'
    + '  <button class="btn btn-danger" id="dupeDelSelectedBtn" disabled>Delete selected</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("doneBtn").addEventListener("click", window.Ledger.closeModal);

    function updateCount(){
      var checked = document.querySelectorAll(".dupe-cb:checked").length;
      var countEl = document.getElementById("dupeSelCount");
      var delBtn = document.getElementById("dupeDelSelectedBtn");
      if(countEl) countEl.textContent = checked + " selected";
      if(delBtn) delBtn.disabled = checked === 0;
    }

    function syncGroupCb(groupIdx){
      var all = document.querySelectorAll('.dupe-cb[data-group="' + groupIdx + '"]');
      var groupCb = document.querySelector('.dupe-group-cb[data-group="' + groupIdx + '"]');
      var checkedCount = 0;
      Array.prototype.forEach.call(all, function(cb){ if(cb.checked) checkedCount++; });
      if(groupCb) groupCb.checked = all.length > 0 && checkedCount === all.length;
    }

    Array.prototype.forEach.call(document.querySelectorAll(".dupe-cb"), function(cb){
      cb.addEventListener("change", function(){
        updateCount();
        syncGroupCb(cb.getAttribute("data-group"));
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".dupe-group-cb"), function(gcb){
      gcb.addEventListener("change", function(){
        var gi = gcb.getAttribute("data-group");
        var rows = document.querySelectorAll('.dupe-cb[data-group="' + gi + '"]');
        Array.prototype.forEach.call(rows, function(cb){ cb.checked = gcb.checked; });
        updateCount();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-dupe-view]"), function(btn){
      btn.addEventListener("click", function(){
        var txId = btn.getAttribute("data-dupe-view");
        var tx = window.Ledger.DB.transactions.find(function(t){ return t.id === txId; });
        if(tx){
          window.Ledger.closeModal();
          window.Ledger.openTxModal(tx);
        }
      });
    });

    document.getElementById("dupeDelSelectedBtn").addEventListener("click", function(){
      var checked = document.querySelectorAll(".dupe-cb:checked");
      if(checked.length === 0) return;
      var ids = [];
      Array.prototype.forEach.call(checked, function(cb){ ids.push(cb.getAttribute("data-dupe-cb")); });

      window.Ledger.openConfirmModal(
        "Delete " + ids.length + " transaction" + (ids.length !== 1 ? "s" : "") + "?",
        "This will permanently remove the selected transactions. This cannot be undone.",
        function(){
          ids.forEach(function(id){ window.Ledger.deleteTransaction(id); });
          window.Ledger.closeModal();
          window.Ledger.showToast(ids.length + " transaction" + (ids.length !== 1 ? "s" : "") + " deleted");
          window.Ledger.openDuplicatesModal();
        }
      );
    });
  });
};

/* ============================================================
   AUTO-CATEGORIZE MODAL
   ============================================================ */
window.Ledger.openAutoCategorizeModal = function(uncatTx){
  var DB = window.Ledger.DB;
  var findCategory = window.Ledger.findCategory;

  var suggestions = uncatTx.map(function(t){
    var sug = window.Ledger.rankCategorySuggestions(t.desc, t.type === "refund" ? "expense" : t.type, DB, findCategory);
    var best = sug.length ? sug[0] : null;
    return { tx: t, suggestion: best };
  });

  var willCategorize = suggestions.filter(function(s){ return s.suggestion; }).length;
  var noMatch = suggestions.length - willCategorize;

  var listHtml = suggestions.slice(0, 30).map(function(s){
    var desc = s.tx.desc || "(no description)";
    var catName = s.suggestion ? s.suggestion.name : "\u2014";
    var cls = s.suggestion ? "auto-cat-match" : "auto-cat-nomatch";
    return '<div class="auto-cat-row ' + cls + '">'
      + '<span class="auto-cat-desc">' + window.Ledger.escapeHtml(desc) + '</span>'
      + '<span class="auto-cat-arrow">\u2192</span>'
      + '<span class="auto-cat-cat">' + window.Ledger.escapeHtml(catName) + '</span>'
      + '</div>';
  }).join("");
  if(suggestions.length > 30){
    listHtml += '<div class="auto-cat-row auto-cat-more">...and ' + (suggestions.length - 30) + ' more</div>';
  }

  var html = '<div class="modal-head">'
    + '<h3>Auto-categorize</h3>'
    + '<button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
    + '</div>'
    + '<div class="modal-body">'
    + '<p style="margin:0 0 12px">Found <strong>' + uncatTx.length + '</strong> uncategorized transaction' + (uncatTx.length !== 1 ? 's' : '') + '.</p>'
    + '<p style="margin:0 0 12px"><strong>' + willCategorize + '</strong> will be categorized'
    + (noMatch > 0 ? ', <strong>' + noMatch + '</strong> have no match' : '') + '.</p>'
    + '<div class="auto-cat-list">' + listHtml + '</div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '<button class="btn" id="cancelBtn">Cancel</button>'
    + '<button class="btn btn-primary" id="confirmAutoCatBtn"' + (!willCategorize ? ' disabled' : '') + '>Categorize ' + willCategorize + ' transaction' + (willCategorize !== 1 ? 's' : '') + '</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("confirmAutoCatBtn").addEventListener("click", function(){
      var updated = 0;
      suggestions.forEach(function(s){
        if(!s.suggestion) return;
        var changes = { category: s.suggestion.id };
        if(s.suggestion.subcategoryId) changes.subcategory = s.suggestion.subcategoryId;
        window.Ledger.updateTransaction(s.tx.id, changes);
        updated++;
      });
      window.Ledger.closeModal();
      window.Ledger.showToast(updated + " transaction" + (updated !== 1 ? "s" : "") + " categorized");
    });
  });
};

})();