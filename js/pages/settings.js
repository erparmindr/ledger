(function(){
window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderSettingsPage = function(){
  var mode = window.Ledger.layoutMode || "auto";
  return ''
    + '<div class="card card-pad">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Layout mode</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Choose how the app adapts to your screen. <strong>Auto</strong> detects your device. <strong>Mobile</strong> hides desktop-heavy features (CSV import, bulk edit). <strong>Desktop</strong> shows everything.</p>'
    + '  <div style="display:flex; gap:8px; flex-wrap:wrap;">'
    + '    <button class="btn btn-sm layout-mode-btn' + (mode==="auto" ? " btn-primary" : "") + '" data-layout-mode="auto">Auto</button>'
    + '    <button class="btn btn-sm layout-mode-btn' + (mode==="mobile" ? " btn-primary" : "") + '" data-layout-mode="mobile">Mobile</button>'
    + '    <button class="btn btn-sm layout-mode-btn' + (mode==="desktop" ? " btn-primary" : "") + '" data-layout-mode="desktop">Desktop</button>'
    + '  </div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Backup &amp; restore</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Export everything (accounts, people, transactions, categories, recurring items) into one file. Use it to move your data to another device or browser, or just keep a safety copy.</p>'
    + '  <div style="display:flex; gap:10px; flex-wrap:wrap;">'
    + '    <button class="btn btn-primary btn-sm" id="exportBackupBtn">Export full backup</button>'
    + '    <button class="btn btn-sm" id="importBackupBtn">Restore from backup</button>'
    + '    <input type="file" id="importBackupFile" accept="application/json" style="display:none;">'
    + '  </div>'
    + '</div>'

    + '<div class="card card-pad section-gap desktop-only">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Import bank statement (CSV)</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Upload a CSV exported from your bank. You\'ll map which column is which before anything is imported.</p>'
    + '  <button class="btn btn-sm" id="importCsvBtn">Choose CSV file</button>'
    + '  <input type="file" id="importCsvFile" accept=".csv" style="display:none;">'
    + '</div>'

    + '<div class="card card-pad section-gap desktop-only">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Import from PDF statement</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Open your PDF statement, select and copy the transaction text, then paste it in. Works across different banks &mdash; you review everything before it\'s imported.</p>'
    + '  <button class="btn btn-sm" id="importStatementBtn">Paste statement text</button>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Demo data</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Load about a year of realistic sample data &mdash; accounts, people, splits, recurring bills, refunds, travel and more &mdash; so you can explore every feature. This replaces your current data. Export a backup first if you need to keep anything.</p>'
    + '  <div style="display:flex; gap:10px; flex-wrap:wrap;">'
    + '    <button class="btn btn-sm" id="loadDemoDataBtn">Load demo data</button>'
    + '  </div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px;">Demo data status</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Live counts and validation checks against whatever data is currently loaded. Re-runs every time you open this page; hit &ldquo;Run checks again&rdquo; to refresh manually.</p>'
    + '  <div id="demoStatusContainer"></div>'
    + '</div>'

    + '<div class="card card-pad section-gap">'
    + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 6px; color:var(--clay);">Reset all data</h2>'
    + '  <p class="muted" style="font-size:12.5px; margin:0 0 14px;">Permanently delete all accounts, transactions, people, categories and recurring items from this browser. Export a backup first if you want to keep anything. <strong>This cannot be undone.</strong></p>'
    + '  <button class="btn btn-danger btn-sm" id="resetAllBtn">Clear all data</button>'
    + '</div>';
};

})();
