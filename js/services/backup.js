(function(){
/* ============================================================
   BACKUP EXPORT / IMPORT
   ============================================================ */
window.Ledger = window.Ledger || {};

window.Ledger.exportBackup = function(){
  var wrapper = window.Ledger.wrapBackup(window.Ledger.DB);
  var blob = new Blob([JSON.stringify(wrapper, null, 2)], {type:"application/json"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = "ledger-backup-" + window.Ledger.todayISO() + ".json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  window.Ledger.recordBackupExport();
  window.Ledger.showToast("Backup downloaded");
};

/* Record the last successful backup for the Data Protection status. */
window.Ledger.recordBackupExport = function(){
  var db = window.Ledger.DB;
  window.Ledger.setBackupMeta({
    lastBackupAt: new Date().toISOString(),
    version: window.Ledger.BACKUP_VERSION,
    counts: {
      accounts: (db.accounts || []).length,
      transactions: (db.transactions || []).length,
      categories: (db.categories || []).length
    }
  });
};

window.Ledger.validateBackup = function validateBackup(data){
  var warnings = [];
  var stats = { accounts:0, transactions:0, categories:0 };

  if(!data || typeof data !== "object") return { valid:false, warnings:["File is not a valid JSON object"], stats:stats };

  var structural = false;
  ["accounts","transactions","categories"].forEach(function(key){
    if(!Array.isArray(data[key])){
      warnings.push("Missing or invalid '" + key + "' array");
      structural = true;
    }
  });
  ["recurring","people","debtItems","groups"].forEach(function(key){
    if(key in data && !Array.isArray(data[key])){
      warnings.push("Invalid '" + key + "' array");
      structural = true;
    }
  });
  if(structural || !Array.isArray(data.accounts)) return { valid:false, warnings:warnings, stats:stats };

  var seenIds = {};

  data.accounts.forEach(function(a, i){
    if(!a.id || !a.name || !a.type) warnings.push("Account #" + (i+1) + " is missing id, name, or type");
    if(a.currency && typeof a.currency !== "string") warnings.push("Account '" + (a.name||"") + "' has invalid currency");
    if(a.id) seenIds["a:" + a.id] = true;
    stats.accounts++;
  });

  (data.categories || []).forEach(function(c, i){
    if(!c.id || !c.name) warnings.push("Category #" + (i+1) + " is missing id or name");
    stats.categories++;
  });

  (data.transactions || []).forEach(function(t, i){
    if(!t.id || !t.type || !t.date || typeof t.amount !== "number") warnings.push("Transaction #" + (i+1) + " is missing id, type, date, or amount");
    else if(isNaN(t.amount) || !isFinite(t.amount)) warnings.push("Transaction '" + (t.desc||t.id) + "' has invalid amount");
    else if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) warnings.push("Transaction '" + (t.desc||t.id) + "' has non-ISO date: " + t.date);
    if(seenIds["t:" + t.id]) warnings.push("Duplicate transaction ID: " + t.id);
    if(t.id) seenIds["t:" + t.id] = true;
    stats.transactions++;
  });

  return { valid: warnings.length === 0, warnings: warnings, stats: stats };
};

window.Ledger.importBackupFile = function(file){
  var reader = new FileReader();
  reader.onload = function(e){
    try{
      var parsed = JSON.parse(e.target.result);
      window.Ledger.restoreBackupData(parsed);
    }catch(err){
      window.Ledger.showToast("Couldn't read that file — is it a valid backup?");
    }
  };
  reader.readAsText(file);
};

/* Shared restore path: accepts a versioned wrapper OR a legacy raw DB
   object (backward compatible). Verifies integrity, migrates, validates,
   confirms, then replaces all data. */
window.Ledger.restoreBackupData = function(parsed){
  var unwrapped = window.Ledger.unwrapBackup(parsed);
  var version = unwrapped.version;
  var isWrapper = unwrapped.isWrapper;

  if(isWrapper && version > window.Ledger.BACKUP_VERSION){
    window.Ledger.showToast("This backup is from a newer version of Ledger and can't be restored here.");
    return;
  }
  if(isWrapper && unwrapped.data !== undefined && !window.Ledger.verifyBackupChecksum(parsed)){
    window.Ledger.openConfirmModal(
      "Backup checksum mismatch",
      "This backup's integrity check failed — the file may be corrupted or modified. Restore anyway?",
      function(){
        window.Ledger._applyBackup(unwrapped, version);
      }
    );
    return;
  }

  var data = window.Ledger.migrateBackup(unwrapped.data, version, window.Ledger.BACKUP_VERSION);
  var result = window.Ledger.validateBackup(data);
  if(!result.valid){
    window.Ledger.showToast("Invalid backup file: " + (result.warnings[0] || "missing required data"));
    return;
  }
  if(!result.stats.accounts && !result.stats.transactions){
    window.Ledger.showToast("That doesn't look like a valid backup file");
    return;
  }
  var statsLine = result.stats.accounts + " accounts, " + result.stats.transactions + " transactions, " + result.stats.categories + " categories";
  if(result.warnings.length === 0){
    window.Ledger.openConfirmModal("Restore backup?", statsLine + "\n\nThis will replace all current data. This can't be undone. Continue?", function(){
      window.Ledger.replaceAllData(data);
      window.Ledger.showToast("Backup restored");
    });
  } else {
    var warnText = result.warnings.slice(0, 8).join("\n");
    if(result.warnings.length > 8) warnText += "\n... and " + (result.warnings.length - 8) + " more";
    window.Ledger.openConfirmModal("Restore backup?", statsLine + "\n\nWarnings:\n" + warnText + "\n\nThis will replace all current data. Restore anyway?", function(){
      window.Ledger.replaceAllData(data);
      window.Ledger.showToast("Backup restored (" + result.warnings.length + " warnings)");
    });
  }
};

/* Apply a backup that passed the checksum-mismatch confirmation. */
window.Ledger._applyBackup = function(unwrapped, version){
  var data = window.Ledger.migrateBackup(unwrapped.data, version, window.Ledger.BACKUP_VERSION);
  var result = window.Ledger.validateBackup(data);
  if(!result.valid){
    window.Ledger.showToast("Invalid backup file: " + (result.warnings[0] || "missing required data"));
    return;
  }
  window.Ledger.replaceAllData(data);
  window.Ledger.showToast("Backup restored");
};

/* ---- CSV export (shared by register + reports) ---- */
window.Ledger._downloadCsv = function(rows, filename){
  var csv = rows.map(function(r){
    return r.map(function(cell){
      var s = String(cell);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
    }).join(",");
  }).join("\n");
  var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.Ledger.exportCsv = function(){
  var list = window.Ledger.filteredTransactions();
  if(list.length === 0){ window.Ledger.showToast("No transactions to export"); return; }
  var rows = [["Date","Type","Description","Notes","Category","Subcategory","Account/From","To","Amount","Currency"]];
  list.slice().sort(function(a,b){ return a.date.localeCompare(b.date); }).forEach(function(t){
    var cur = "USD", from="", to="";
    if(t.type === "transfer"){
      var fr = window.Ledger.entityRef(t.fromType,t.fromId), toR = window.Ledger.entityRef(t.toType,t.toId);
      from = fr?fr.name:""; to = toR?toR.name:""; cur = fr?fr.currency:"USD";
    } else if(t.linkId){
      var acc = window.Ledger.findAccount(t.account);
      from = acc?acc.name:""; cur = acc?acc.currency:"USD";
      var otherRow = window.Ledger.DB.transactions.find(function(x){ return x.linkId===t.linkId && x.id!==t.id; });
      var otherAcc = otherRow ? window.Ledger.findAccount(otherRow.account) : null;
      to = otherAcc ? otherAcc.name : "";
    } else {
      var acc2 = window.Ledger.findAccount(t.account);
      from = acc2?acc2.name:""; cur = acc2?acc2.currency:"USD";
    }
    rows.push([t.date, t.linkId ? "transfer (cross-currency)" : t.type, t.desc||"", t.notes||"", t.category?window.Ledger.categoryName(t.category):"", t.subcategory?window.Ledger.subcatName(t.category,t.subcategory):"", from, to, t.amount.toFixed(2), cur]);
  });
  window.Ledger._downloadCsv(rows, "ledger-export-" + window.Ledger.todayISO() + ".csv");
};

})();
