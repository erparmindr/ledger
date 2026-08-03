(function(){
window.Ledger = window.Ledger || {};

var _cdIdCounter = 0;

function cdClose(wrap){
  var list = wrap._cdList || wrap.querySelector(".cd-list");
  if(list && list.parentNode !== wrap) wrap.appendChild(list);
  list.style.cssText = "";
  wrap.classList.remove("open");
  wrap.setAttribute("aria-expanded", "false");
}

function cdOpen(wrap, list){
  var rect = wrap.getBoundingClientRect();
  document.body.appendChild(list);
  var spaceBelow = window.innerHeight - rect.bottom - 4;
  var spaceAbove = rect.top - 4;
  var vw = window.innerWidth || document.documentElement.clientWidth || 320;
  if(list.classList.contains("cd-list-wide")){
    list.style.cssText = "position:fixed;left:"+rect.left+"px;right:auto;width:auto;min-width:"+Math.max(rect.width, 220)+"px;max-width:"+(vw-16)+"px;z-index:9999;display:block;";
    if(list.offsetWidth && rect.left + list.offsetWidth > vw - 8){
      list.style.left = Math.max(8, vw - list.offsetWidth - 8) + "px";
    }
  } else {
    list.style.cssText = "position:fixed;left:"+rect.left+"px;width:"+rect.width+"px;z-index:9999;display:block;";
  }
  if(spaceBelow >= 80 || spaceBelow >= spaceAbove){
    list.style.top = (rect.bottom + 4) + "px";
    list.style.maxHeight = Math.max(80, spaceBelow - 4) + "px";
  } else {
    list.style.bottom = (window.innerHeight - rect.top + 4) + "px";
    list.style.maxHeight = Math.max(80, spaceAbove - 4) + "px";
  }
  wrap.classList.add("open");
  wrap.setAttribute("aria-expanded", "true");
}

/* ============================================================
   CUSTOM DROPDOWN — replaces native <select> with themed dropdowns
   List is portaled to document.body when open to avoid any clipping
   from modal overflow, border-radius, or filter stacking contexts.
   ============================================================ */
window.Ledger._cdGlobalListener = false;

function cdCreateItem(sel, list, wrap, opt, idx){
  var item = document.createElement("div");
  item.className = "cd-item" + (opt.value === sel.value ? " selected" : "");
  item.setAttribute("data-val", opt.value);
  item.setAttribute("role", "option");
  item.setAttribute("aria-selected", opt.value === sel.value ? "true" : "false");
  item.setAttribute("aria-disabled", opt.disabled ? "true" : "false");
  if(opt.disabled) item.className += " cd-disabled";
  item.textContent = opt.textContent;
  list.appendChild(item);

  item.addEventListener("click", function(e){
    e.stopPropagation();
    if(item.classList.contains("cd-disabled")) return;
    sel.value = item.getAttribute("data-val");
    triggerSync(list, wrap, item);
    if(!item.hasAttribute("data-no-close")) cdClose(wrap);
    sel.dispatchEvent(new Event("change", {bubbles:true}));
  });
  return item;
}

function triggerSync(list, wrap, item){
  var trigger = wrap.querySelector(".cd-trigger");
  if(!trigger) return;
  trigger.textContent = item.textContent;
  Array.prototype.forEach.call(list.querySelectorAll(".cd-item"), function(x){
    var isSel = x === item;
    x.classList.toggle("selected", isSel);
    x.setAttribute("aria-selected", isSel ? "true" : "false");
  });
}

function cdEnabledItems(list){
  return Array.prototype.filter.call(list.querySelectorAll(".cd-item"), function(x){
    return !x.classList.contains("cd-disabled");
  });
}

function cdSetActive(wrap, list, item){
  var items = list.querySelectorAll(".cd-item");
  Array.prototype.forEach.call(items, function(x){ x.classList.remove("cd-active"); });
  if(item){
    item.classList.add("cd-active");
    wrap.setAttribute("aria-activedescendant", item.id);
    item.scrollIntoView({block:"nearest"});
  } else {
    wrap.removeAttribute("aria-activedescendant");
  }
}

function cdActiveItem(list){
  var active = list.querySelector(".cd-item.cd-active");
  if(active) return active;
  var sel = list.querySelector(".cd-item.selected");
  return sel || list.querySelector(".cd-item:not(.cd-disabled)");
}

window.Ledger.initCustomDropdowns = function(){
  var selects = document.querySelectorAll("select:not(.cd-initialized):not([data-no-cd])");
  Array.prototype.forEach.call(selects, function(sel){
    sel.classList.add("cd-initialized");
    sel.style.display = "none";

    var wrap = document.createElement("div");
    wrap.className = "cd-wrap";
    if(sel.classList.contains("is-filtered")) wrap.classList.add("is-filtered");
    if(sel.disabled) wrap.classList.add("cd-wrap-disabled");
    wrap.setAttribute("tabindex", sel.disabled ? "-1" : "0");
    wrap.setAttribute("role", "combobox");
    wrap.setAttribute("aria-haspopup", "listbox");
    wrap.setAttribute("aria-expanded", "false");

    var fieldLabel = sel.closest ? sel.closest(".field, .form-row, .modal-row") : null;
    var labelEl = fieldLabel ? fieldLabel.querySelector("label") : null;
    var name = labelEl ? (labelEl.textContent || "").replace(/\s+/g, " ").trim() : "";
    if(name) wrap.setAttribute("aria-label", name);

    var trigger = document.createElement("div");
    trigger.className = "cd-trigger";

    var list = document.createElement("div");
    list.className = "cd-list";
    if(sel.closest && sel.closest(".filters-bar")) list.classList.add("cd-list-wide");
    list.setAttribute("role", "listbox");
    _cdIdCounter++;
    list.id = "cd-list-" + _cdIdCounter;
    wrap._cdList = list;
    wrap.setAttribute("aria-controls", list.id);

    function buildItems(){
      list.innerHTML = "";
      var opts = sel.querySelectorAll("option");
      var val = sel.value;
      Array.prototype.forEach.call(opts, function(opt, i){
        var item = cdCreateItem(sel, list, wrap, opt, i);
        if(!item.id) item.id = list.id + "-opt-" + i;
        if(opt.value === val) trigger.textContent = opt.textContent;
      });
    }
    buildItems();

    wrap.appendChild(trigger);
    wrap.appendChild(list);
    sel.parentNode.insertBefore(wrap, sel);

    wrap.addEventListener("click", function(e){
      if(sel.disabled) return;
      e.stopPropagation();
      var wasOpen = wrap.classList.contains("open");
      document.querySelectorAll(".cd-wrap.open").forEach(function(w){ cdClose(w); });
      if(!wasOpen){
        cdOpen(wrap, list);
        cdSetActive(wrap, list, cdActiveItem(list));
      }
    });

    wrap.addEventListener("keydown", function(e){
      if(sel.disabled) return;
      var open = wrap.classList.contains("open");
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        if(!open){
          document.querySelectorAll(".cd-wrap.open").forEach(function(w){ cdClose(w); });
          cdOpen(wrap, list);
          cdSetActive(wrap, list, cdActiveItem(list));
          return;
        }
        var active = cdActiveItem(list);
        if(active && !active.classList.contains("cd-disabled")){
          sel.value = active.getAttribute("data-val");
          triggerSync(list, wrap, active);
          if(!active.hasAttribute("data-no-close")) cdClose(wrap);
          sel.dispatchEvent(new Event("change", {bubbles:true}));
        }
        return;
      }
      if(e.key === "Escape"){
        cdClose(wrap);
        return;
      }
      if(e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End"){
        e.preventDefault();
        if(!open){
          document.querySelectorAll(".cd-wrap.open").forEach(function(w){ cdClose(w); });
          cdOpen(wrap, list);
        }
        var items = cdEnabledItems(list);
        if(!items.length) return;
        var current = list.querySelector(".cd-item.cd-active");
        var curIdx = items.indexOf(current);
        var nextIdx;
        if(e.key === "Home") nextIdx = 0;
        else if(e.key === "End") nextIdx = items.length - 1;
        else if(e.key === "ArrowDown") nextIdx = curIdx < 0 ? 0 : Math.min(items.length - 1, curIdx + 1);
        else nextIdx = curIdx <= 0 ? items.length - 1 : curIdx - 1;
        cdSetActive(wrap, list, items[nextIdx]);
        return;
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

  wrap.classList.toggle("cd-wrap-disabled", sel.disabled);
  wrap.setAttribute("tabindex", sel.disabled ? "-1" : "0");
  list.innerHTML = "";
  var options = sel.querySelectorAll("option");

  Array.prototype.forEach.call(options, function(opt, i){
    var item = cdCreateItem(sel, list, wrap, opt, i);
    if(!item.id) item.id = list.id + "-opt-" + i;
    if(opt.value === sel.value) trigger.textContent = opt.textContent;
  });
};

})();
