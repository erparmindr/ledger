window.Ledger = window.Ledger || {};

/* ============================================================
   CUSTOM DROPDOWN — replaces native <select> with themed dropdowns
   Skips selects marked with data-no-cd (e.g. Transactions toolbar).
   ============================================================ */
window.Ledger._cdGlobalListener = false;
window.Ledger.initCustomDropdowns = function(){
  var selects = document.querySelectorAll("select:not(.cd-initialized):not([data-no-cd])");
  Array.prototype.forEach.call(selects, function(sel){
    sel.classList.add("cd-initialized");
    sel.style.display = "none";

    var wrap = document.createElement("div");
    wrap.className = "cd-wrap";
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
        wrap.classList.remove("open");
        sel.dispatchEvent(new Event("change", {bubbles:true}));
      });
    });

    wrap.appendChild(trigger);
    wrap.appendChild(list);
    sel.parentNode.insertBefore(wrap, sel);

    wrap.addEventListener("click", function(e){
      e.stopPropagation();
      var wasOpen = wrap.classList.contains("open");
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){ w.classList.remove("open"); });
      if(!wasOpen) wrap.classList.add("open");
    });

    wrap.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        wrap.click();
      }
      if(e.key === "Escape"){
        wrap.classList.remove("open");
      }
    });
  });

  if(!window.Ledger._cdGlobalListener){
    window.Ledger._cdGlobalListener = true;
    document.addEventListener("click", function(){
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){ w.classList.remove("open"); });
    });
  }
};
