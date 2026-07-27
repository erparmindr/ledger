(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   CUSTOM DROPDOWN — replaces native <select> with themed dropdowns
   Skips selects marked with data-no-cd (e.g. table-embedded or constrained selects).
   ============================================================ */
window.Ledger._cdGlobalListener = false;
window.Ledger.initCustomDropdowns = function(){
  var selects = document.querySelectorAll("select:not(.cd-initialized):not([data-no-cd])");
  Array.prototype.forEach.call(selects, function(sel){
    sel.classList.add("cd-initialized");
    sel.style.display = "none";

    var wrap = document.createElement("div");
    wrap.className = "cd-wrap";
    if(sel.classList.contains("is-filtered")) wrap.classList.add("is-filtered");
    wrap.setAttribute("tabindex", "0");

    var trigger = document.createElement("div");
    trigger.className = "cd-trigger";

    var list = document.createElement("div");
    list.className = "cd-list";

    var options = sel.querySelectorAll("option");
    var currentVal = sel.value;

    Array.prototype.forEach.call(options, function(opt){
      var item = document.createElement("div");
      item.className = "cd-item" + (opt.value === currentVal ? " selected" : "");
      item.setAttribute("data-val", opt.value);
      if(opt.disabled) item.className += " cd-disabled";
      item.textContent = opt.textContent;
      if(opt.value === currentVal) trigger.textContent = opt.textContent;
      list.appendChild(item);

      item.addEventListener("click", function(e){
        e.stopPropagation();
        if(item.classList.contains("cd-disabled")) return;
        sel.value = item.getAttribute("data-val");
        trigger.textContent = item.textContent;
        Array.prototype.forEach.call(list.querySelectorAll(".cd-item"), function(x){ x.classList.remove("selected"); });
        item.classList.add("selected");
        if(!item.hasAttribute("data-no-close")){
          wrap.classList.remove("open");
          list.style.position = ""; list.style.top = ""; list.style.left = ""; list.style.width = ""; list.style.bottom = ""; list.style.maxHeight = "";
        }
        sel.dispatchEvent(new Event("change", {bubbles:true}));
      });
    });

    wrap.appendChild(trigger);
    wrap.appendChild(list);
    sel.parentNode.insertBefore(wrap, sel);

    wrap.addEventListener("click", function(e){
      e.stopPropagation();
      var wasOpen = wrap.classList.contains("open");
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){
        w.classList.remove("open");
        var l = w.querySelector(".cd-list");
        if(l){ l.style.position = ""; l.style.top = ""; l.style.left = ""; l.style.width = ""; l.style.bottom = ""; l.style.maxHeight = ""; }
      });
      if(!wasOpen){
        wrap.classList.add("open");
        var rect = wrap.getBoundingClientRect();
        list.style.position = "fixed";
        list.style.left = rect.left + "px";
        list.style.width = rect.width + "px";
        var spaceBelow = window.innerHeight - rect.bottom - 4;
        var spaceAbove = rect.top - 4;
        if(spaceBelow >= 80 || spaceBelow >= spaceAbove){
          list.style.top = (rect.bottom + 4) + "px";
          list.style.maxHeight = Math.max(80, spaceBelow - 4) + "px";
        } else {
          list.style.bottom = (window.innerHeight - rect.top + 4) + "px";
          list.style.maxHeight = Math.max(80, spaceAbove - 4) + "px";
        }
      }
    });

    wrap.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        wrap.click();
      }
      if(e.key === "Escape"){
        wrap.classList.remove("open");
        list.style.position = ""; list.style.top = ""; list.style.left = ""; list.style.width = ""; list.style.bottom = ""; list.style.maxHeight = "";
      }
    });
  });

  if(!window.Ledger._cdGlobalListener){
    window.Ledger._cdGlobalListener = true;
    document.addEventListener("click", function(){
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){
        w.classList.remove("open");
        var l = w.querySelector(".cd-list");
        if(l){ l.style.position = ""; l.style.top = ""; l.style.left = ""; l.style.width = ""; l.style.bottom = ""; l.style.maxHeight = ""; }
      });
    });
  }
};

/* ============================================================
   REFRESH — rebuild cd-items after native select innerHTML changes
   ============================================================ */
window.Ledger.refreshCustomDropdown = function(sel){
  if(!sel) return;
  var wrap = sel.previousElementSibling;
  if(!wrap || !wrap.classList.contains("cd-wrap")) return;
  var list = wrap.querySelector(".cd-list");
  var trigger = wrap.querySelector(".cd-trigger");
  if(!list || !trigger) return;

  list.innerHTML = "";
  var options = sel.querySelectorAll("option");
  var currentVal = sel.value;

  Array.prototype.forEach.call(options, function(opt){
    var item = document.createElement("div");
    item.className = "cd-item" + (opt.value === currentVal ? " selected" : "");
    item.setAttribute("data-val", opt.value);
    if(opt.disabled) item.className += " cd-disabled";
    item.textContent = opt.textContent;
    if(opt.value === currentVal) trigger.textContent = opt.textContent;
    list.appendChild(item);

    item.addEventListener("click", function(e){
      e.stopPropagation();
      if(item.classList.contains("cd-disabled")) return;
      sel.value = item.getAttribute("data-val");
      trigger.textContent = item.textContent;
      Array.prototype.forEach.call(list.querySelectorAll(".cd-item"), function(x){ x.classList.remove("selected"); });
      item.classList.add("selected");
      if(!item.hasAttribute("data-no-close")){
        wrap.classList.remove("open");
        list.style.position = ""; list.style.top = ""; list.style.left = ""; list.style.width = ""; list.style.bottom = ""; list.style.maxHeight = "";
      }
      sel.dispatchEvent(new Event("change", {bubbles:true}));
    });
  });
};

})();
