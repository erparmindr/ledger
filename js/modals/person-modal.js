(function(){
window.Ledger = window.Ledger || {};

/* ---------- Person modal ---------- */
window.Ledger.openPersonModal = function(existing){
  var isEdit = !!existing;
  var p = existing ? Object.assign({}, existing) : { name:"" };
  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit person':'Add person') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <div class="field"><label>Name</label><input type="text" id="pName" value="' + window.Ledger.escapeHtml(p.name) + '" placeholder="e.g. Alex"></div>'
    + '  <p class="faint" style="font-size:11.5px; margin:0;">Whatever currency a transaction or split is in, that\'s what they\'ll owe in &mdash; no need to fix a currency per person.</p>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="savePersonBtn">' + (isEdit?'Save changes':'Add person') + '</button>'
    + '</div>';
  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("savePersonBtn").addEventListener("click", function(){
      var name = document.getElementById("pName").value.trim();
      if(!name){ window.Ledger.showToast("Enter a name"); return; }
      var rec = { id: isEdit?p.id:window.Ledger.uid(), name:name, created: isEdit?p.created:Date.now() };
      if(isEdit){ window.Ledger.updatePerson(rec); }
      else window.Ledger.addPerson(rec);
      window.Ledger.closeModal();
    });
  });
};

})();