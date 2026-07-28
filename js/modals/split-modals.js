(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   CATEGORY SPLIT MODAL — divide one expense across categories
   ============================================================ */
window.Ledger.openCategorySplitModal = function(totalAmount, existingSplits, txType, onDone){
  var rowsState = existingSplits && existingSplits.length ? existingSplits.map(function(s){ return {categoryId:s.categoryId, amount:s.amount}; }) : [
    {categoryId:"", amount: totalAmount}
  ];

  function render(){
    var expenseCats = window.Ledger.DB.categories.filter(function(c){
      if(txType === "refund" || txType === "transfer") return true;
      if(txType === "expense") return c.type === "expense";
      if(txType === "income") return c.type !== "expense";
      return true;
    });
    var catOpts = '<option value="">Choose category</option>' + expenseCats.map(function(c){ return '<option value="'+c.id+'">'+window.Ledger.escapeHtml(c.name)+'</option>'; }).join("");

    var rowsHtml = rowsState.map(function(r, i){
      var thisOpts = catOpts.replace('value="'+r.categoryId+'"', 'value="'+r.categoryId+'" selected');
      return '<div class="form-row" data-split-row="'+i+'" style="align-items:flex-end;">'
        + '  <div class="field"><label>Category</label><select class="splitCatSel" data-idx="'+i+'">'+thisOpts+'</select></div>'
        + '  <div class="field" style="max-width:130px;"><label>Amount</label><input type="number" class="splitAmtInput" data-idx="'+i+'" step="0.01" min="0" value="'+r.amount+'"></div>'
        + '  <button type="button" class="icon-btn danger splitRemoveBtn" data-idx="'+i+'" title="Remove row" style="margin-bottom:9px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
        + '</div>';
    }).join("");

    var sum = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
    var remaining = Math.round((totalAmount - sum) * 100) / 100;
    var remainingColor = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";

    var html = ''
      + '<div class="modal-head"><h3>Split across categories</h3><button class="icon-btn" id="closeSubBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      + '<div class="modal-body">'
      + '  <p class="faint" style="font-size:11.5px; margin:0;">Total to split: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b></p>'
      + '  <div id="splitRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + rowsHtml + '</div>'
      + '  <button type="button" class="btn btn-sm" id="addSplitRowBtn">+ Add category</button>'
      + '  <div style="font-size:12.5px; font-weight:700; color:'+remainingColor+';">Remaining: ' + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " &#10003; matches total" : "") + '</div>'
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);

      Array.prototype.forEach.call(document.querySelectorAll(".splitCatSel"), function(sel){
        sel.addEventListener("change", function(){ rowsState[parseInt(sel.getAttribute("data-idx"),10)].categoryId = sel.value; });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".splitAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          rowsState[parseInt(inp.getAttribute("data-idx"),10)].amount = parseFloat(inp.value)||0;
          render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".splitRemoveBtn"), function(btn){
        btn.addEventListener("click", function(){
          if(rowsState.length <= 1){ window.Ledger.showToast("Keep at least one row, or cancel the split"); return; }
          rowsState.splice(parseInt(btn.getAttribute("data-idx"),10), 1);
          render();
        });
      });
      document.getElementById("addSplitRowBtn").addEventListener("click", function(){
        var usedSum = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
        var leftover = Math.max(0, Math.round((totalAmount - usedSum) * 100) / 100);
        rowsState.push({categoryId:"", amount: leftover});
        render();
      });
      document.getElementById("saveSplitBtn").addEventListener("click", function(){
        var sumNow = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
        if(Math.abs(sumNow - totalAmount) > 0.005){ window.Ledger.showToast("Split amounts must add up to the total (" + window.Ledger.fmtMoney(totalAmount) + ")"); return; }
        for(var i=0;i<rowsState.length;i++){
          if(!rowsState[i].categoryId){ window.Ledger.showToast("Choose a category for every row"); return; }
        }
        window.Ledger.closeSubModal();
        onDone(rowsState.map(function(r){ return {categoryId:r.categoryId, amount:r.amount}; }));
      });
    });
  }
  render();
};

/* ============================================================
   FRIEND SPLIT MODAL — your share + debt items per friend
   ============================================================ */
window.Ledger.openFriendSplitModal = function(totalAmount, existing, onDone){
  var shares = existing && existing.shares ? existing.shares.map(function(s){ return Object.assign({},s); }) : [
    {personId:"", amount:0}
  ];
  var yourShare = existing ? existing.yourShare : Math.round((totalAmount/2)*100)/100;

  function evenSplit(){
    var n = shares.length + 1;
    var even = Math.round((totalAmount / n) * 100) / 100;
    yourShare = even;
    shares.forEach(function(s){ s.amount = even; });
    var sum = yourShare + shares.reduce(function(a,s){return a+s.amount;},0);
    var diff = Math.round((totalAmount - sum) * 100) / 100;
    if(shares.length) shares[shares.length-1].amount = Math.round((shares[shares.length-1].amount + diff)*100)/100;
    else yourShare = Math.round((yourShare + diff)*100)/100;
  }

  function render(){
    var peopleOpts = '<option value="">Pending &mdash; assign later</option>' + window.Ledger.DB.people.map(function(p){ return '<option value="'+p.id+'">'+window.Ledger.escapeHtml(p.name)+'</option>'; }).join("");

    var rowsHtml = shares.map(function(s, i){
      var thisOpts = peopleOpts.replace('value="'+s.personId+'"', 'value="'+s.personId+'" selected');
      return '<div class="form-row" data-friend-row="'+i+'" style="align-items:flex-end;">'
        + '  <div class="field"><label>Friend</label><select class="friendPersonSel" data-idx="'+i+'">'+thisOpts+'</select></div>'
        + '  <div class="field" style="max-width:130px;"><label>Their share</label><input type="number" class="friendAmtInput" data-idx="'+i+'" step="0.01" min="0" value="'+s.amount+'"></div>'
        + '  <button type="button" class="icon-btn danger friendRemoveBtn" data-idx="'+i+'" title="Remove" style="margin-bottom:9px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'
        + '</div>';
    }).join("");

    var sum = yourShare + shares.reduce(function(a,s){ return a + (parseFloat(s.amount)||0); }, 0);
    var remaining = Math.round((totalAmount - sum) * 100) / 100;
    var remainingColor = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";
    var unassignedCount = shares.filter(function(s){ return !s.personId; }).length;

    var html = ''
      + '<div class="modal-head"><h3>Split with friends</h3><button class="icon-btn" id="closeSubBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      + '<div class="modal-body">'
      + '  <p class="faint" style="font-size:11.5px; margin:0;">Total: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b> &middot; your share becomes a real expense, each friend\'s share becomes money owed to you.</p>'
      + '  <div class="field"><label>Your share</label><input type="number" id="yourShareInput" step="0.01" min="0" value="'+yourShare+'"></div>'
      + '  <div id="friendRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + rowsHtml + '</div>'
      + '  <div style="display:flex; gap:8px;">'
      + '    <button type="button" class="btn btn-sm" id="addFriendRowBtn">+ Add friend</button>'
      + '    <button type="button" class="btn btn-sm" id="addNewPersonBtn">+ New person</button>'
      + '    <button type="button" class="btn btn-sm" id="evenSplitBtn">Split evenly</button>'
      + '  </div>'
      + '  <div style="font-size:12.5px; font-weight:700; color:'+remainingColor+';">Remaining: ' + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " &#10003; matches total" : "") + '</div>'
      + (unassignedCount ? '<p class="faint" style="font-size:11px; margin:0;">' + unassignedCount + ' share' + (unassignedCount===1?"":"s") + ' left pending &mdash; assign a real person any time from the People page.</p>' : '')
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveFriendSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);

      document.getElementById("yourShareInput").addEventListener("input", function(e){
        yourShare = parseFloat(e.target.value)||0;
        render();
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendPersonSel"), function(sel){
        sel.addEventListener("change", function(){ shares[parseInt(sel.getAttribute("data-idx"),10)].personId = sel.value; });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          shares[parseInt(inp.getAttribute("data-idx"),10)].amount = parseFloat(inp.value)||0;
          render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendRemoveBtn"), function(btn){
        btn.addEventListener("click", function(){
          if(shares.length <= 1){ window.Ledger.showToast("Keep at least one friend, or cancel the split"); return; }
          shares.splice(parseInt(btn.getAttribute("data-idx"),10), 1);
          render();
        });
      });
      document.getElementById("addFriendRowBtn").addEventListener("click", function(){
        shares.push({personId:"", amount:0});
        render();
      });
      document.getElementById("evenSplitBtn").addEventListener("click", function(){
        evenSplit();
        render();
      });
      document.getElementById("addNewPersonBtn").addEventListener("click", function(){
        window.Ledger.openTextPromptModal("Add person", "Name", "", function(name){
          var newPerson = { id: window.Ledger.uid(), name:name, created: Date.now() };
          window.Ledger.DB.people.push(newPerson);
          window.Ledger.saveData();
          shares.push({personId:newPerson.id, amount:0});
          render();
        });
      });
      document.getElementById("saveFriendSplitBtn").addEventListener("click", function(){
        var sumNow = yourShare + shares.reduce(function(a,s){ return a + (parseFloat(s.amount)||0); }, 0);
        if(Math.abs(sumNow - totalAmount) > 0.005){ window.Ledger.showToast("Shares must add up to the total (" + window.Ledger.fmtMoney(totalAmount) + ")"); return; }
        if(shares.some(function(s){ return !s.amount || s.amount <= 0; })){ window.Ledger.showToast("Every friend needs a share greater than 0"); return; }
        window.Ledger.closeSubModal();
        onDone({ yourShare: yourShare, shares: shares.map(function(s){ return {personId: s.personId||null, amount: s.amount}; }) });
      });
    });
  }
  render();
};

})();