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
        + '  <button type="button" class="icon-btn danger splitRemoveBtn" data-idx="'+i+'" title="Remove row" aria-label="Remove row" style="margin-bottom:9px;">'+window.Ledger.iconTrash()+'</button>'
        + '</div>';
    }).join("");

    function updateRemaining(){
      var el = document.getElementById("splitRemaining");
      if(!el) return;
      var sum = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
      var remaining = Math.round((totalAmount - sum) * 100) / 100;
      el.innerHTML = "Remaining: " + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " <span class=\"split-ok\">&#10003; matches total</span>" : "");
      el.style.color = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";
    }

    var html = ''
+ window.Ledger.modalHead('Split across categories', { id: "closeSubBtn" })
    + '<div class="modal-body">'
      + '  <div class="split-summary"><span>Total to split: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b></span><span id="splitCount" class="faint"></span></div>'
      + '  <div id="splitRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + rowsHtml + '</div>'
      + '  <button type="button" class="btn btn-sm" id="addSplitRowBtn">+ Add category</button>'
      + '  <div style="font-size:12.5px; font-weight:700; color:var(--clay);" id="splitRemaining"></div>'
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      updateRemaining();

      Array.prototype.forEach.call(document.querySelectorAll(".splitCatSel"), function(sel){
        sel.addEventListener("change", function(){ rowsState[parseInt(sel.getAttribute("data-idx"),10)].categoryId = sel.value; });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".splitAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          var v = parseFloat(inp.value);
          rowsState[parseInt(inp.getAttribute("data-idx"),10)].amount = isFinite(v) ? v : 0;
          updateRemaining();
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

  function friendOptions(selectedId){
    var people = window.Ledger.DB.people;
    var placeholder = people.length ? "Select friend..." : "No friends yet";
    var opts = '<option value="">' + placeholder + '</option>';
    people.forEach(function(p){
      opts += '<option value="'+p.id+'"'+(p.id===selectedId?" selected":"")+'>'+window.Ledger.escapeHtml(p.name)+'</option>';
    });
    return opts;
  }

  function renderRows(){
    return shares.map(function(s, i){
      return '<div class="form-row" data-friend-row="'+i+'" style="align-items:flex-end;">'
        + '  <div class="field"><label>Friend</label><select class="friendPersonSel" data-idx="'+i+'">'+friendOptions(s.personId)+'</select></div>'
        + '  <div class="field" style="max-width:140px;"><label>Their share</label><input type="number" class="friendAmtInput" data-idx="'+i+'" step="0.01" min="0" value="'+s.amount+'"></div>'
        + '  <button type="button" class="icon-btn danger friendRemoveBtn" data-idx="'+i+'" title="Remove" aria-label="Remove row" style="margin-bottom:9px;">'+window.Ledger.iconTrash()+'</button>'
        + '</div>';
    }).join("");
  }

  function updateTotals(){
    var friends = shares.reduce(function(a,s){ return a + (parseFloat(s.amount)||0); }, 0);
    var remaining = Math.round((totalAmount - yourShare - friends) * 100) / 100;
    var ysEl = document.getElementById("friendYourShare");
    if(ysEl) ysEl.textContent = window.Ledger.fmtMoney(yourShare);
    var remEl = document.getElementById("friendRemaining");
    if(remEl){
      remEl.innerHTML = "Remaining: " + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " <span class=\"split-ok\">&#10003; adds up</span>" : "");
      remEl.style.color = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";
    }
  }

  function updateUnassignedNote(){
    var el = document.getElementById("friendUnassignedNote");
    if(!el) return;
    var unassigned = shares.filter(function(s){ return !s.personId; }).length;
    if(unassigned){
      el.style.display = "block";
      el.textContent = unassigned + " share" + (unassigned===1?"":"s") + " not assigned to a friend yet \u2014 you can assign it any time from the People page.";
    } else {
      el.style.display = "none";
    }
  }

  function render(){
    var html = ''
+ window.Ledger.modalHead('Split with friends', { id: "closeSubBtn" })
    + '<div class="modal-body">'
      + '  <div class="split-summary">'
      + '    <span>Total: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b></span>'
      + '    <span>Your share: <b class="num" id="friendYourShare">' + window.Ledger.fmtMoney(yourShare) + '</b></span>'
      + '  </div>'
      + '  <div class="field"><label>Your share</label><input type="number" id="yourShareInput" step="0.01" min="0" value="'+yourShare+'"></div>'
      + '  <div class="split-section-label">Friends owe you</div>'
      + '  <div id="friendRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + renderRows() + '</div>'
      + '  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">'
      + '    <button type="button" class="btn btn-sm" id="addFriendRowBtn">+ Add friend</button>'
      + '    <button type="button" class="btn btn-sm" id="addNewPersonBtn">+ New person</button>'
      + '    <button type="button" class="btn btn-sm" id="evenSplitBtn">Split evenly</button>'
      + '  </div>'
      + '  <div style="font-size:12.5px; font-weight:700; color:var(--clay); margin-top:12px;" id="friendRemaining"></div>'
      + '  <p class="faint" id="friendUnassignedNote" style="font-size:11px; margin:0;"></p>'
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveFriendSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      updateTotals();
      updateUnassignedNote();

      document.getElementById("yourShareInput").addEventListener("input", function(e){
        yourShare = parseFloat(e.target.value)||0;
        updateTotals();
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendPersonSel"), function(sel){
        sel.addEventListener("change", function(){
          shares[parseInt(sel.getAttribute("data-idx"),10)].personId = sel.value;
          updateUnassignedNote();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          var v = parseFloat(inp.value);
          shares[parseInt(inp.getAttribute("data-idx"),10)].amount = isFinite(v) ? v : 0;
          updateTotals();
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