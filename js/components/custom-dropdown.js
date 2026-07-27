(function(){
window.Ledger = window.Ledger || {};

function cdClose(wrap){
  var list = wrap._cdList || wrap.querySelector(".cd-list");
  if(list && list.parentNode !== wrap) wrap.appendChild(list);
  list.style.cssText = "";
  wrap.classList.remove("open");
}

function cdOpen(wrap, list){
  var rect = wrap.getBoundingClientRect();
  document.body.appendChild(list);
  var spaceBelow = window.innerHeight - rect.bottom - 4;
  var spaceAbove = rect.top - 4;
  list.style.cssText = "position:fixed;left:"+rect.left+"px;width:"+rect.width+"px;z-index:9999;display:block;";
  if(spaceBelow >= 80 || spaceBelow >= spaceAbove){
    list.style.top = (rect.bottom + 4) + "px";
    list.style.maxHeight = Math.max(80, spaceBelow - 4) + "px";
  } else {
    list.style.bottom = (window.innerHeight - rect.top + 4) + "px";
    list.style.maxHeight = Math.max(80, spaceAbove - 4) + "px";
  }
  wrap.classList.add("open");
}

/* ============================================================
   CUSTOM DROPDOWN — replaces native <select> with themed dropdowns
   List is portaled to document.body when open to avoid any clipping
   from modal overflow, border-radius, or filter stacking contexts.
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
    wrap._cdList = list;

    var options = sel.querySelectorAll("option");
    var currentVal = sel.value;

    function buildItems(){
      list.innerHTML = "";
      var opts = sel.querySelectorAll("option");
      var val = sel.value;
      Array.prototype.forEach.call(opts, function(opt){
        var item = document.createElement("div");
        item.className = "cd-item" + (opt.value === val ? " selected" : "");
        item.setAttribute("data-val", opt.value);
        if(opt.disabled) item.className += " cd-disabled";
        item.textContent = opt.textContent;
        if(opt.value === val) trigger.textContent = opt.textContent;
        list.appendChild(item);

        item.addEventListener("click", function(e){
          e.stopPropagation();
          if(item.classList.contains("cd-disabled")) return;
          sel.value = item.getAttribute("data-val");
          trigger.textContent = item.textContent;
          Array.prototype.forEach.call(list.querySelectorAll(".cd-item"), function(x){ x.classList.remove("selected"); });
          item.classList.add("selected");
          if(!item.hasAttribute("data-no-close")) cdClose(wrap);
          sel.dispatchEvent(new Event("change", {bubbles:true}));
        });
      });
    }
    buildItems();

    wrap.appendChild(trigger);
    wrap.appendChild(list);
    sel.parentNode.insertBefore(wrap, sel);

    wrap.addEventListener("click", function(e){
      e.stopPropagation();
      var wasOpen = wrap.classList.contains("open");
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){ cdClose(w); });
      if(!wasOpen) cdOpen(wrap, list);
    });

    wrap.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        wrap.click();
      }
      if(e.key === "Escape"){
        cdClose(wrap);
      }
    });
  });

  if(!window.Ledger._cdGlobalListener){
    window.Ledger._cdGlobalListener = true;
    document.addEventListener("click", function(){
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){ cdClose(w); });
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
  var list = wrap._cdList || wrap.querySelector(".cd-list");
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
      if(!item.hasAttribute("data-no-close")) cdClose(wrap);
      sel.dispatchEvent(new Event("change", {bubbles:true}));
    });
  });
};

})();