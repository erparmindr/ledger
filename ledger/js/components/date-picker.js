window.Ledger = window.Ledger || {};

/* ============================================================
   CUSTOM DATE PICKER — replaces native input[type="date"]
   with a themed text field + calendar dropdown.
   ============================================================ */
window.Ledger.initDatePickers = function(){
  var inputs = document.querySelectorAll('input[type="date"]:not(.dp-initialized)');
  Array.prototype.forEach.call(inputs, function(inp){
    inp.classList.add("dp-initialized");
    var value = inp.value || "";
    var parentField = inp.closest(".field");

    var wrap = document.createElement("div");
    wrap.className = "dp-wrap" + (parentField ? " in-field" : "");

    var display = document.createElement("div");
    display.className = "dp-display";
    display.tabIndex = 0;

    var text = document.createElement("span");
    text.className = "dp-text";
    text.textContent = value ? window.Ledger.dpFormatDate(value) : "Select date";

    var icon = document.createElement("span");
    icon.className = "dp-icon";
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

    display.appendChild(text);
    display.appendChild(icon);
    wrap.appendChild(display);

    if(parentField){
      parentField.insertBefore(wrap, inp);
      parentField.removeChild(inp);
    } else {
      inp.parentNode.insertBefore(wrap, inp);
      inp.parentNode.removeChild(inp);
    }

    var hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.value = value;
    hidden.className = "dp-hidden";
    if(inp.id) hidden.id = inp.id;
    if(inp.name) hidden.name = inp.name;
    wrap.appendChild(hidden);

    var panel = document.createElement("div");
    panel.className = "dp-panel";
    wrap.appendChild(panel);

    var currentMonth = value ? new Date(value + "T00:00:00") : new Date();
    if(!value){ currentMonth.setDate(1); }

    function render(){
      var y = currentMonth.getFullYear();
      var m = currentMonth.getMonth();
      var today = new Date();
      today.setHours(0,0,0,0);
      var selected = hidden.value ? new Date(hidden.value + "T00:00:00") : null;
      if(selected) selected.setHours(0,0,0,0);

      var firstDay = new Date(y, m, 1).getDay();
      var daysInMonth = new Date(y, m + 1, 0).getDate();
      var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      var dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];

      var html = '<div class="dp-head">'
        + '<button class="dp-nav dp-prev" type="button">&lsaquo;</button>'
        + '<span class="dp-title">' + monthNames[m] + " " + y + '</span>'
        + '<button class="dp-nav dp-next" type="button">&rsaquo;</button>'
        + '</div>'
        + '<div class="dp-grid">';
      for(var d = 0; d < 7; d++){
        html += '<div class="dp-dow">' + dayNames[d] + '</div>';
      }
      for(var i = 0; i < firstDay; i++){
        html += '<div class="dp-day dp-empty"></div>';
      }
      for(var d = 1; d <= daysInMonth; d++){
        var dt = new Date(y, m, d);
        dt.setHours(0,0,0,0);
        var cls = "dp-day";
        if(dt.getTime() === today.getTime()) cls += " today";
        if(selected && dt.getTime() === selected.getTime()) cls += " selected";
        html += '<button class="' + cls + '" type="button" data-date="' + y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0') + '">' + d + '</button>';
      }
      html += '</div>';
      panel.innerHTML = html;

      var prevBtn = panel.querySelector(".dp-prev");
      var nextBtn = panel.querySelector(".dp-next");
      prevBtn.addEventListener("click", function(e){
        e.stopPropagation();
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        render();
      });
      nextBtn.addEventListener("click", function(e){
        e.stopPropagation();
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        render();
      });

      var dayBtns = panel.querySelectorAll(".dp-day:not(.dp-empty)");
      Array.prototype.forEach.call(dayBtns, function(btn){
        btn.addEventListener("click", function(e){
          e.stopPropagation();
          var val = btn.getAttribute("data-date");
          hidden.value = val;
          text.textContent = window.Ledger.dpFormatDate(val);
          text.classList.remove("placeholder");
          close();
          hidden.dispatchEvent(new Event("change", {bubbles:true}));
        });
      });
    }

    function open(){
      if(value){
        currentMonth = new Date(value + "T00:00:00");
      } else {
        currentMonth = new Date();
        currentMonth.setDate(1);
      }
      render();
      panel.classList.add("open");
      display.classList.add("active");
    }
    function close(){
      panel.classList.remove("open");
      display.classList.remove("active");
    }

    display.addEventListener("click", function(e){
      e.stopPropagation();
      if(panel.classList.contains("open")) close(); else open();
    });
    display.addEventListener("keydown", function(e){
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        if(panel.classList.contains("open")) close(); else open();
      }
      if(e.key === "Escape") close();
    });

    window.Ledger._dpCloseHandler = window.Ledger._dpCloseHandler || false;
    if(!window.Ledger._dpCloseHandler){
      window.Ledger._dpCloseHandler = true;
      document.addEventListener("click", function(e){
        var openPanels = document.querySelectorAll(".dp-panel.open");
        Array.prototype.forEach.call(openPanels, function(p){
          if(!p.parentElement.contains(e.target)){
            p.classList.remove("open");
            var d = p.parentElement.querySelector(".dp-display");
            if(d) d.classList.remove("active");
          }
        });
      });
    }

    if(!value) text.classList.add("placeholder");
  });
};

window.Ledger.dpFormatDate = function(iso){
  if(!iso) return "";
  var parts = iso.split("-");
  if(parts.length !== 3) return iso;
  var m = parseInt(parts[1], 10);
  var d = parseInt(parts[2], 10);
  var y = parseInt(parts[0], 10);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[m-1] + " " + d + ", " + y;
};

/* Wire a dp-wrap panel inside a custom dropdown cd-date-range.
   hiddenInput: the .dp-hidden element
    stateObj: window.Ledger key name (e.g. "txFilters")
   stateKey: property name (e.g. "dateFrom")
   renderFn: function name to call after update (e.g. "renderPage")
*/
window.Ledger._wireDatePickerPanel = function(hiddenInput, stateObj, stateKey, renderFn){
  if(!hiddenInput) return;
  var wrap = hiddenInput.closest(".dp-wrap");
  if(!wrap) return;
  var display = wrap.querySelector(".dp-display");
  var text = wrap.querySelector(".dp-text");
  var panel = wrap.querySelector(".dp-panel");
  if(!display || !panel) return;

  var currentMonth = hiddenInput.value ? new Date(hiddenInput.value + "T00:00:00") : new Date();
  if(!hiddenInput.value) currentMonth.setDate(1);

  function renderCalendar(){
    var y = currentMonth.getFullYear();
    var m = currentMonth.getMonth();
    var today = new Date();
    today.setHours(0,0,0,0);
    var selected = hiddenInput.value ? new Date(hiddenInput.value + "T00:00:00") : null;
    if(selected) selected.setHours(0,0,0,0);
    var firstDay = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    var dayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];
    var html = '<div class="dp-head">'
      + '<button class="dp-nav dp-prev" type="button">&lsaquo;</button>'
      + '<span class="dp-title">' + monthNames[m] + " " + y + '</span>'
      + '<button class="dp-nav dp-next" type="button">&rsaquo;</button>'
      + '</div><div class="dp-grid">';
    for(var d = 0; d < 7; d++) html += '<div class="dp-dow">' + dayNames[d] + '</div>';
    for(var i = 0; i < firstDay; i++) html += '<div class="dp-day dp-empty"></div>';
    for(var d = 1; d <= daysInMonth; d++){
      var dt = new Date(y, m, d); dt.setHours(0,0,0,0);
      var cls = "dp-day";
      if(dt.getTime() === today.getTime()) cls += " today";
      if(selected && dt.getTime() === selected.getTime()) cls += " selected";
      html += '<button class="' + cls + '" type="button" data-date="' + y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0') + '">' + d + '</button>';
    }
    html += '</div>';
    panel.innerHTML = html;
    panel.querySelector(".dp-prev").addEventListener("click", function(e){ e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth()-1); renderCalendar(); });
    panel.querySelector(".dp-next").addEventListener("click", function(e){ e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth()+1); renderCalendar(); });
    Array.prototype.forEach.call(panel.querySelectorAll(".dp-day:not(.dp-empty)"), function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var val = btn.getAttribute("data-date");
        hiddenInput.value = val;
        text.textContent = window.Ledger.dpFormatDate(val);
        text.classList.remove("placeholder");
        panel.classList.remove("open");
        display.classList.remove("active");
        if(window.Ledger[stateObj]) window.Ledger[stateObj][stateKey] = val;
        if(renderFn && window.Ledger[renderFn]) window.Ledger[renderFn]();
      });
    });
  }

  display.addEventListener("click", function(e){
    e.stopPropagation();
    var wasOpen = panel.classList.contains("open");
    document.querySelectorAll(".dp-panel.open").forEach(function(p){ p.classList.remove("open"); });
    document.querySelectorAll(".dp-display.active").forEach(function(d){ d.classList.remove("active"); });
    if(!wasOpen){
      currentMonth = hiddenInput.value ? new Date(hiddenInput.value + "T00:00:00") : new Date();
      if(!hiddenInput.value) currentMonth.setDate(1);
      renderCalendar();
      panel.classList.add("open");
      display.classList.add("active");
    }
  });
};
