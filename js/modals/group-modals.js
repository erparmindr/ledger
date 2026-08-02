(function(){
window.Ledger = window.Ledger || {};

/* ---------- Add group modal ---------- */
window.Ledger.openAddGroupModal = function(){
  var html = ''
    + window.Ledger.modalHead('Add group')
    + '<div class="modal-body">'
    + '  <div class="field"><label>Group name</label><input type="text" id="groupName" placeholder="e.g. Joint"></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveGroupBtn">Add group</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("saveGroupBtn").addEventListener("click", function(){
      var name = document.getElementById("groupName").value.trim();
      if(!name){ window.Ledger.showToast("Enter a group name"); return; }
      window.Ledger.addGroup({ id: window.Ledger.uid(), name: name, created: Date.now() });
      window.Ledger.closeModal();
    });
  });
};

/* ---------- Edit group modal ---------- */
window.Ledger.openEditGroupModal = function(groupId){
  var g = (window.Ledger.DB.groups || []).find(function(g){ return g.id === groupId; });
  if(!g) return;

  var html = ''
    + window.Ledger.modalHead('Edit group')
    + '<div class="modal-body">'
    + '  <div class="field"><label>Group name</label><input type="text" id="groupName" value="' + window.Ledger.escapeHtml(g.name) + '"></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveGroupBtn">Save changes</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("saveGroupBtn").addEventListener("click", function(){
      var name = document.getElementById("groupName").value.trim();
      if(!name){ window.Ledger.showToast("Enter a group name"); return; }
      window.Ledger.updateGroup({ id: g.id, name: name, created: g.created });
      window.Ledger.closeModal();
    });
  });
};

})();