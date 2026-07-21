window.Ledger = window.Ledger || {};

/* ============================================================
   CSV IMPORT MODAL
   ============================================================ */
window.Ledger.parseCsv = function(text){
  var rows = [];
  var cur = "", row = [], inQuotes = false;
  for(var i=0;i<text.length;i++){
    var ch = text[i];
    if(inQuotes){
      if(ch === '"'){ if(text[i+1] === '"'){ cur+='"'; i++; } else inQuotes=false; }
      else cur += ch;
    } else {
      if(ch === '"') inQuotes = true;
      else if(ch === ','){ row.push(cur); cur=""; }
      else if(ch === '\n'){ row.push(cur); rows.push(row); row=[]; cur=""; }
      else if(ch === '\r'){ /* skip */ }
      else cur += ch;
    }
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(function(r){ return r.length > 1 || (r.length===1 && r[0].trim()!==""); });
};

window.Ledger.openCsvImportModal = function(file){
  var reader = new FileReader();
  reader.onload = function(e){
    var rows = window.Ledger.parseCsv(e.target.result);
    if(rows.length < 1){ window.Ledger.showToast("Couldn't find any rows in that file"); return; }

    // Detect whether first row is a header or data
    // A row is a header if its first cell doesn't look like a date or number
    function looksLikeDate(s){ return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(s); }
    function looksLikeNumber(s){ return /^[\d,.\-\$\(\)]+$/.test(s.trim()) && s.trim().length > 0; }
    var firstCell = (rows[0][0]||"").trim();
    var hasHeader = !looksLikeDate(firstCell) && !looksLikeNumber(firstCell);

    var headers, dataRows, allDataRows;
    if(hasHeader){
      headers = rows[0];
      allDataRows = rows.slice(1);
      dataRows = allDataRows.slice(0, 8);
    } else {
      // No header — generate positional labels
      var ncols = rows[0].length;
      headers = [];
      for(var ci=0; ci<ncols; ci++) headers.push("Column " + (ci+1));
      allDataRows = rows;
      dataRows = rows.slice(0, 8);
    }

    // Auto-detect TD bank format: ISO date, description, debit (or empty), credit (or empty), balance
    // Signature: 5 cols, col0 = YYYY-MM-DD date, col2 & col3 are numeric/empty, col4 looks like running balance
    function isTDCSV(){
      if(rows[0].length < 4) return false;
      var sample = hasHeader ? rows.slice(1,4) : rows.slice(0,4);
      var tdRows = 0;
      sample.forEach(function(r){
        if(r.length >= 4 && looksLikeDate((r[0]||"").trim())){
          var col2 = (r[2]||"").trim(), col3 = (r[3]||"").trim();
          if((col2===""||looksLikeNumber(col2)) && (col3===""||looksLikeNumber(col3))) tdRows++;
        }
      });
      return tdRows >= Math.min(2, sample.length);
    }

    var tdFormat = isTDCSV();

    var accOpts = window.Ledger.DB.accounts.filter(function(a){ return !a.archived; }).map(function(a){ return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+'</option>'; }).join("");
    var headerOpts = '<option value="">Skip / not present</option>' + headers.map(function(h,i){ return '<option value="'+i+'">'+window.Ledger.escapeHtml(h)+'</option>'; }).join("");

    function autoDetect(keywords){
      var found = "";
      headers.forEach(function(h,i){
        var hl = h.toLowerCase().replace(/[^a-z0-9]/g," ");
        keywords.forEach(function(k){
          var re = new RegExp("(^|\\s)" + k + "(\\s|$)");
          if(re.test(hl) && found === "") found = String(i);
        });
      });
      return found;
    }

    var guessDate, guessDesc, guessAmt, guessDr, guessCr, defaultSplit;

    if(tdFormat){
      // TD: date=0, desc=1, debit=2, credit=3, balance=4 (skip)
      guessDate = "0"; guessDesc = "1"; guessDr = "2"; guessCr = "3"; guessAmt = ""; defaultSplit = true;
    } else {
      guessDate = autoDetect(["date","posted","trans"]);
      guessDesc = autoDetect(["desc","narr","memo","particular","detail","ref","particulars"]);
      guessAmt  = autoDetect(["amount","amt"]);
      guessDr   = autoDetect(["debit","dr","withdrawal","withdrawals","withdraw","out"]);
      guessCr   = autoDetect(["credit","cr","deposit","deposits","in"]);
      defaultSplit = (guessDr !== "" || guessCr !== "");
    }

    function selOpts(guess){
      return '<option value="">Skip / not present</option>' + headers.map(function(h,i){
        return '<option value="'+i+'" '+(String(i)===guess?'selected':'')+'>'+window.Ledger.escapeHtml(h)+'</option>';
      }).join("");
    }

    var previewHtml = '<table style="width:100%; font-size:11px; border-collapse:collapse;"><tr>'
      + headers.map(function(h){ return '<th style="text-align:left; padding:4px 8px; border-bottom:1px solid var(--border); color:var(--text-dim); white-space:nowrap;">'+window.Ledger.escapeHtml(h)+'</th>'; }).join("")
      + '</tr>' + dataRows.map(function(r){
        return '<tr>' + r.map(function(c){ return '<td style="padding:4px 8px; border-bottom:1px solid var(--border-soft); white-space:nowrap;">'+window.Ledger.escapeHtml(c)+'</td>'; }).join("") + '</tr>';
      }).join("") + '</table>';

    var tdBadge = tdFormat ? '<span style="background:var(--sage-soft);color:var(--sage);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;">TD Bank detected</span>' : '';

    var html = ''
      + '<div class="modal-head"><h3>Import CSV &middot; map columns' + tdBadge + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      + '<div class="modal-body">'
      + '  <div style="overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); max-height:140px;">' + previewHtml + '</div>'
      + (tdFormat ? '<p class="faint" style="font-size:11.5px; margin:0;">TD bank format detected automatically &mdash; columns pre-mapped. Just pick your account and import.</p>' : '')
      + '  <div style="display:flex; gap:8px; align-items:center;">'
      + '    <span class="faint" style="font-size:11.5px; font-weight:700;">Amount format:</span>'
      + '    <div class="toggle-pair">'
      + '      <button type="button" id="modeSignedBtn" class="' + (!defaultSplit ? 'active' : '') + '">Single column (signed)</button>'
      + '      <button type="button" id="modeSplitBtn" class="' + (defaultSplit ? 'active' : '') + '">Debit &amp; credit columns</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="form-row">'
      + '    <div class="field"><label>Date column</label><select id="mapDate">' + selOpts(guessDate) + '</select></div>'
      + '    <div class="field"><label>Description column</label><select id="mapDesc">' + selOpts(guessDesc) + '</select></div>'
      + '  </div>'
      + '  <div id="signedRow" class="form-row" style="display:' + (!defaultSplit ? 'flex' : 'none') + ';">'
      + '    <div class="field"><label>Amount column <span class="faint">(negative = expense)</span></label><select id="mapAmount">' + selOpts(guessAmt) + '</select></div>'
      + '    <div class="field" style="display:flex; align-items:flex-end; padding-bottom:2px;"><label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:11.5px; color:var(--text-dim);"><input type="checkbox" id="invertSign"> Invert sign (positive = expense)</label></div>'
      + '  </div>'
      + '  <div id="splitRow" class="form-row" style="display:' + (defaultSplit ? 'flex' : 'none') + ';">'
      + '    <div class="field"><label>Debit column <span class="faint">(money out)</span></label><select id="mapDebit">' + selOpts(guessDr) + '</select></div>'
      + '    <div class="field"><label>Credit column <span class="faint">(money in)</span></label><select id="mapCredit">' + selOpts(guessCr) + '</select></div>'
      + '  </div>'
      + '  <div class="field"><label>Import into account</label><select id="mapAccount">' + accOpts + '</select></div>'
      + '  <div id="samplePreview" style="display:none; margin-top:4px; padding:10px 12px; border:1px solid var(--border); border-radius:var(--radius); background:var(--surface-2);">'
      + '    <div style="font-size:11px; font-weight:700; color:var(--text-dim); margin-bottom:6px;">Preview (first 3 rows)</div>'
      + '    <div id="sampleRows"></div>'
      + '  </div>'
      + '  <p class="faint" style="font-size:11.5px; margin:0;">Rows where amount is 0 or unreadable are skipped. You can edit any entry afterward.</p>'
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="doImportBtn">Import</button></div>';

    window.Ledger.openModal(html, function(){
      document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
      document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);

      var isSplitMode = defaultSplit;
      document.getElementById("modeSignedBtn").addEventListener("click", function(){
        isSplitMode = false;
        document.getElementById("modeSignedBtn").classList.add("active");
        document.getElementById("modeSplitBtn").classList.remove("active");
        document.getElementById("signedRow").style.display = "flex";
        document.getElementById("splitRow").style.display = "none";
      });
      document.getElementById("modeSplitBtn").addEventListener("click", function(){
        isSplitMode = true;
        document.getElementById("modeSplitBtn").classList.add("active");
        document.getElementById("modeSignedBtn").classList.remove("active");
        document.getElementById("signedRow").style.display = "none";
        document.getElementById("splitRow").style.display = "flex";
      });

      // Auto-check "Invert sign" when credit card account is selected
      var acctSel = document.getElementById("mapAccount");
      var invertCb = document.getElementById("invertSign");
      acctSel.addEventListener("change", function(){
        var acc = window.Ledger.findAccount(acctSel.value);
        if(acc && acc.type === "credit_card"){
          invertCb.checked = true;
          updateSamplePreview();
        }
      });

      // Live sample preview: show 3 rows with proposed type
      function updateSamplePreview(){
        var previewEl = document.getElementById("samplePreview");
        var rowsEl = document.getElementById("sampleRows");
        if(!previewEl || !rowsEl) return;

        var dateIdx = document.getElementById("mapDate").value;
        var descIdx = document.getElementById("mapDesc").value;
        var amtSel = document.getElementById("mapAmount");
        var amtIdx = amtSel ? amtSel.value : "";
        var invertChecked = invertCb && invertCb.checked;
        var drSel = document.getElementById("mapDebit");
        var crSel = document.getElementById("mapCredit");
        var drIdx = drSel ? drSel.value : "";
        var crIdx = crSel ? crSel.value : "";

        if(isSplitMode ? (drIdx==="" && crIdx==="") : amtIdx===""){
          previewEl.style.display = "none";
          return;
        }

        var samples = allDataRows.slice(0, 3);
        if(samples.length === 0){ previewEl.style.display = "none"; return; }

        var html = samples.map(function(r){
          var rawDate = (r[dateIdx]||"").trim();
          var desc = descIdx !== "" ? (r[descIdx]||"").trim() : "";
          var amt, type;

          if(!isSplitMode){
            var rawAmt = (r[amtIdx]||"").trim();
            var isParenNeg = /^\(.*\)$/.test(rawAmt);
            var cleaned = rawAmt.replace(/[^0-9.\-]/g,"");
            amt = parseFloat(cleaned);
            if(isNaN(amt) || amt === 0) return null;
            if(isParenNeg) amt = -amt;
            if(invertChecked) amt = -amt;
            type = amt < 0 ? "expense" : "income";
            amt = Math.abs(amt);
          } else {
            var rawDr = drIdx !== "" ? (r[drIdx]||"").replace(/[^0-9.]/g,"") : "";
            var rawCr = crIdx !== "" ? (r[crIdx]||"").replace(/[^0-9.]/g,"") : "";
            var drAmt = rawDr ? parseFloat(rawDr) : 0;
            var crAmt = rawCr ? parseFloat(rawCr) : 0;
            if(drAmt > 0 && crAmt === 0){ type = "expense"; amt = drAmt; }
            else if(crAmt > 0 && drAmt === 0){ type = "income"; amt = crAmt; }
            else return null;
          }

          var typeColor = type === "expense" ? "var(--clay)" : "var(--sage)";
          return '<div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; font-size:11.5px;">'
            + '<span class="faint">' + window.Ledger.escapeHtml(desc || rawDate || "—") + '</span>'
            + '<span style="color:' + typeColor + '; font-weight:600;">' + type + ' ' + window.Ledger.fmtMoney(amt) + '</span>'
            + '</div>';
        }).filter(Boolean).join("");

        if(!html){ previewEl.style.display = "none"; return; }
        rowsEl.innerHTML = html;
        previewEl.style.display = "block";
      }

      // Wire preview to all mapping controls
      ["mapDate","mapDesc","mapAmount","mapDebit","mapCredit","mapAccount"].forEach(function(id){
        var el = document.getElementById(id);
        if(el) el.addEventListener("change", updateSamplePreview);
      });
      if(invertCb) invertCb.addEventListener("change", updateSamplePreview);
      document.getElementById("modeSignedBtn").addEventListener("click", function(){ setTimeout(updateSamplePreview, 0); });
      document.getElementById("modeSplitBtn").addEventListener("click", function(){ setTimeout(updateSamplePreview, 0); });
      updateSamplePreview();

      document.getElementById("doImportBtn").addEventListener("click", function(){
        var dateIdx = document.getElementById("mapDate").value;
        var descIdx = document.getElementById("mapDesc").value;
        var account = document.getElementById("mapAccount").value;
        if(dateIdx === ""){ window.Ledger.showToast("Map the Date column"); return; }
        if(!account){ window.Ledger.showToast("Choose an account to import into"); return; }

        var amtIdx, drIdx, crIdx;
        if(!isSplitMode){
          amtIdx = document.getElementById("mapAmount").value;
          if(amtIdx === ""){ window.Ledger.showToast("Map the Amount column"); return; }
        } else {
          drIdx = document.getElementById("mapDebit").value;
          crIdx = document.getElementById("mapCredit").value;
          if(drIdx === "" && crIdx === ""){ window.Ledger.showToast("Map at least one of Debit or Credit column"); return; }
        }

        // Parse into preview rows instead of committing directly
        var parsedRows = [];
        allDataRows.forEach(function(r){
          var rawDate = (r[dateIdx]||"").trim();
          var isoDate = window.Ledger.normalizeDate(rawDate);
          if(!isoDate) return;

          var amt, type;
          if(!isSplitMode){
            var rawAmt = (r[amtIdx]||"").trim();
            // Handle parenthetical negatives: ($45.20) or (1,234.56)
            var isParenNeg = /^\(.*\)$/.test(rawAmt);
            var cleaned = rawAmt.replace(/[^0-9.\-]/g,"");
            amt = parseFloat(cleaned);
            if(isNaN(amt) || amt === 0) return;
            if(isParenNeg) amt = -amt;
            // Invert sign toggle: positive = expense
            if(document.getElementById("invertSign") && document.getElementById("invertSign").checked) amt = -amt;
            type = amt < 0 ? "expense" : "income";
            amt = Math.abs(amt);
          } else {
            var rawDr = drIdx !== "" ? (r[drIdx]||"").replace(/[^0-9.]/g,"") : "";
            var rawCr = crIdx !== "" ? (r[crIdx]||"").replace(/[^0-9.]/g,"") : "";
            var drAmt = rawDr ? parseFloat(rawDr) : 0;
            var crAmt = rawCr ? parseFloat(rawCr) : 0;
            if(isNaN(drAmt)) drAmt = 0;
            if(isNaN(crAmt)) crAmt = 0;
            if(drAmt > 0 && crAmt === 0){ type = "expense"; amt = drAmt; }
            else if(crAmt > 0 && drAmt === 0){ type = "income"; amt = crAmt; }
            else if(drAmt > 0 && crAmt > 0){ type = drAmt >= crAmt ? "expense" : "income"; amt = Math.max(drAmt, crAmt); }
            else return;
          }

          var desc = descIdx !== "" ? ((r[descIdx]||"").trim() || "Imported transaction") : "Imported transaction";

          var TRANSFER_KW = /\b(transfer|payment|cc\s*pay|credit\s*card\s*pay|e\s*transfer|etransfer|interac|pay\s*credit|pay\s*visa|pay\s*mastercard|payment\s*to|payment\s*from)\b/i;
          if(type !== "transfer" && TRANSFER_KW.test(desc)) type = "transfer";

          var REFUND_KW = /\b(refund|return|reversal|chargeback|credit\s*refund)\b/i;
          if(type !== "transfer" && REFUND_KW.test(desc)) type = "refund";

          parsedRows.push({ date: isoDate, amount: amt, type: type, desc: desc, raw: r.join(", ") });
        });

        if(parsedRows.length === 0){ window.Ledger.showToast("No valid rows found — check your column mapping"); return; }
        window.Ledger.openImportPreviewModal(parsedRows, account, "CSV");
      });
    });
  };
  reader.readAsText(file);
};


/* ============================================================
   DATE PARSING UTILITIES
   ============================================================ */
window.Ledger.normalizeDate = function(raw){
  raw = raw.trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0,10);
  var m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m){
    var a=parseInt(m[1],10), b=parseInt(m[2],10), y=m[3];
    if(y.length===2) y = "20"+y;
    var mm, dd;
    if(a > 12){ mm = b; dd = a; }
    else if(b > 12){ mm = a; dd = b; }
    else { mm = b; dd = a; }
    return y + "-" + window.Ledger.pad2(mm) + "-" + window.Ledger.pad2(dd);
  }
  var d = new Date(raw);
  if(!isNaN(d.getTime())) return window.Ledger.todayISOFromDate(d);
  return null;
};

window.Ledger.todayISOFromDate = function(d){
  return d.getFullYear() + "-" + window.Ledger.pad2(d.getMonth()+1) + "-" + window.Ledger.pad2(d.getDate());
};
