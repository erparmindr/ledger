(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   MODAL SYSTEM — append-based stacking
   Opens a new backdrop+modal child; closeModal removes the top.
   Underlying modals keep their DOM + event listeners intact.
   ============================================================ */
window.Ledger.modalStack = [];
window.Ledger._focusStack = [];

var FOCUSABLE = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

function trapFocus(backdrop, e){
  var focusable = backdrop.querySelectorAll(FOCUSABLE);
  if(!focusable.length) return;
  var first = focusable[0];
  var last = focusable[focusable.length - 1];
  if(e.shiftKey && document.activeElement === first){
    e.preventDefault();
    last.focus();
  } else if(!e.shiftKey && document.activeElement === last){
    e.preventDefault();
    first.focus();
  }
}

if(!window.Ledger._modalEscapeAdded){
  window.Ledger._modalEscapeAdded = true;
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape") return;
    if(!window.Ledger.modalStack.length) return;
    if(document.querySelector(".cd-wrap.open")) return;
    window.Ledger.closeModal();
  });
}

window.Ledger.openModal = function (html, onMount, className) {
  var root = document.getElementById("modalRoot");
  var idx = window.Ledger.modalStack.length;
  var modalClass = "modal" + (className ? " " + className : "");
  var backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.style.zIndex = 100 + idx;
  backdrop.innerHTML = '<div class="' + modalClass + '" role="dialog" aria-modal="true">' + html + '</div>';
  root.appendChild(backdrop);
  document.querySelectorAll(".cd-wrap.open").forEach(function(w){ var l=w._cdList||w.querySelector(".cd-list"); if(l&&l.parentNode!==w)w.appendChild(l); l.style.cssText=""; w.classList.remove("open"); });
  window.Ledger._focusStack.push(document.activeElement);
  window.Ledger.modalStack.push(backdrop);
  backdrop.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal-backdrop")) window.Ledger.closeModal();
  });
  backdrop.addEventListener("keydown", function(e){
    if(e.key === "Tab"){
      trapFocus(backdrop, e);
    }
  });
  if (onMount) onMount(backdrop);
  if (window.Ledger.initCustomDropdowns) window.Ledger.initCustomDropdowns();
  if (window.Ledger.initDatePickers) window.Ledger.initDatePickers();
  if (window.Ledger.refreshIcons) window.Ledger.refreshIcons();
  var firstFocusable = backdrop.querySelector(FOCUSABLE);
  if(firstFocusable) firstFocusable.focus();
};

window.Ledger.openSubModal = function (html, onMount) {
  var top = window.Ledger.modalStack[window.Ledger.modalStack.length - 1];
  if(top && top.classList.contains("modal-backdrop-sub")){
    window.Ledger.modalStack.pop();
    top.remove();
    window.Ledger._focusStack.pop();
  }
  window.Ledger.openModal(html, function (bd) {
    bd.classList.add("modal-backdrop-sub");
    if (onMount) onMount(bd);
  });
};

window.Ledger.closeSubModal = function () {
  window.Ledger.closeModal();
};

window.Ledger.closeModal = function () {
  document.querySelectorAll(".cd-wrap.open").forEach(function(w){ var l=w._cdList||w.querySelector(".cd-list"); if(l&&l.parentNode!==w)w.appendChild(l); l.style.cssText=""; w.classList.remove("open"); });
  var top = window.Ledger.modalStack.pop();
  if (top) top.remove();
  var prevFocus = window.Ledger._focusStack.pop();
  if(prevFocus && prevFocus.focus) prevFocus.focus();
};

/* ============================================================
   UTILITY MODALS
   ============================================================ */

window.Ledger.openTextPromptModal = function (title, placeholder, initial, onSave) {
  var html = ''
    + '<div class="modal-head"><h3>' + window.Ledger.escapeHtml(title) + '</h3><button class="icon-btn close-btn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body"><div class="field"><input type="text" id="promptInput" value="' + window.Ledger.escapeHtml(initial || "") + '" placeholder="' + window.Ledger.escapeHtml(placeholder) + '"></div></div>'
    + '<div class="modal-foot"><button class="btn cancel-btn">Cancel</button><button class="btn btn-primary ok-btn">Save</button></div>';
  window.Ledger.openModal(html, function (bd) {
    bd.querySelector(".close-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector(".cancel-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector("#promptInput").focus();
    bd.querySelector(".ok-btn").addEventListener("click", function () {
      var v = bd.querySelector("#promptInput").value.trim();
      if (!v) { window.Ledger.showToast("Enter a value"); return; }
      window.Ledger.closeModal();
      onSave(v);
    });
  });
};

window.Ledger.openConfirmModal = function (title, message, onConfirm) {
  var html = ''
    + '<div class="modal-head"><h3>' + window.Ledger.escapeHtml(title) + '</h3><button class="icon-btn close-btn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body"><p style="margin:0; font-size:13.5px;">' + message + '</p></div>'
    + '<div class="modal-foot"><button class="btn cancel-btn">Cancel</button><button class="btn btn-danger confirm-btn">Confirm</button></div>';
  window.Ledger.openModal(html, function (bd) {
    bd.querySelector(".close-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector(".cancel-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector(".confirm-btn").addEventListener("click", function () { onConfirm(); window.Ledger.closeModal(); });
  });
};

window.Ledger.openMarkPaidModal = function (debtItem) {
  var person = window.Ledger.findPerson(debtItem.personId);
  var accOpts = window.Ledger.DB.accounts.filter(function (a) { return !a.archived; }).map(function (a) {
    return '<option value="' + a.id + '">' + window.Ledger.escapeHtml(a.name) + ' (' + a.currency + ')</option>';
  }).join("");
  var html = ''
    + '<div class="modal-head"><h3>Mark as paid</h3><button class="icon-btn close-btn" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<div class="modal-body">'
    + '  <p style="font-size:13px; margin:0;">' + window.Ledger.escapeHtml((person || {}).name || "This person") + ' paying back <b class="num">' + window.Ledger.fmtMoney(debtItem.amount, debtItem.currency) + '</b> for &ldquo;' + window.Ledger.escapeHtml(debtItem.description) + '&rdquo;.</p>'
    + '  <div class="field"><label>Deposit into account</label><select id="paidAccount">' + accOpts + '</select></div>'
    + '  <p class="faint" style="font-size:11.5px; margin:0;">This records the repayment as a transfer, not income, since it\'s money you already spent being paid back.</p>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn cancel-btn">Cancel</button><button class="btn btn-primary" id="confirmPaidBtn">Mark paid &amp; record deposit</button></div>';
  window.Ledger.openModal(html, function (bd) {
    bd.querySelector(".close-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector(".cancel-btn").addEventListener("click", window.Ledger.closeModal);
    bd.querySelector("#confirmPaidBtn").addEventListener("click", function () {
      var accountId = bd.querySelector("#paidAccount").value;
      if (!accountId) { window.Ledger.showToast("Choose an account"); return; }
      window.Ledger.updateDebtItem(debtItem.id, { status: "settled", settledDate: window.Ledger.todayISO() }, true);
      window.Ledger.addTransaction({
        id: window.Ledger.uid(),
        type: "transfer",
        date: window.Ledger.todayISO(),
        amount: debtItem.amount,
        desc: "Repayment: " + debtItem.description,
        notes: "Debt settlement for " + (person ? person.name : "person"),
        fromType: "person",
        fromId: debtItem.personId,
        toType: "account",
        toId: accountId,
        debtItemId: debtItem.id,
        created: Date.now()
      });
      window.Ledger.closeModal();
      window.Ledger.showToast("Marked as paid");
    });
  });
};

})();
