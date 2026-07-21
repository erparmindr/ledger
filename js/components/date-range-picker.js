window.Ledger = window.Ledger || {};

/* ============================================================
   DATE RANGE PICKER — standalone popover with side-by-side
   calendars, quick-jump chips, editable inputs, Apply/Cancel.
   Replaces the old inline date range div inside the preset dropdown.
   ============================================================ */

/* ---- Helpers ---- */
window.Ledger._drpISO = function(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};

window.Ledger._drpParseInput = function(val){
  var m = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m){
    var mo=parseInt(m[1],10), dy=parseInt(m[2],10), yr=parseInt(m[3],10);
    if(mo>=1&&mo<=12&&dy>=1&&dy<=31&&yr>=2000&&yr<=2099)
      return yr+'-'+String(mo).padStart(2,'0')+'-'+String(dy).padStart(2,'0');
  }
  var m2 = val.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m2){
    var yr2=parseInt(m2[1],10), mo2=parseInt(m2[2],10), dy2=parseInt(m2[3],10);
    if(mo2>=1&&mo2<=12&&dy2>=1&&dy2<=31&&yr2>=2000&&yr2<=2099)
      return yr2+'-'+String(mo2).padStart(2,'0')+'-'+String(dy2).padStart(2,'0');
  }
  return null;
};

window.Ledger._drpMonthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
window.Ledger._drpShortMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
window.Ledger._drpDayNames = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/* ---- Render a single month calendar HTML ---- */
window.Ledger._drpCalHTML = function(monthDate, side, fromISO, toISO, todayISO){
  var y = monthDate.getFullYear();
  var m = monthDate.getMonth();
  var firstDay = new Date(y, m, 1).getDay();
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var fromDate = fromISO ? new Date(fromISO+"T00:00:00") : null;
  var toDate = toISO ? new Date(toISO+"T00:00:00") : null;
  var todayDate = todayISO ? new Date(todayISO+"T00:00:00") : null;

  var html = '<div class="drp-calendar" data-side="'+side+'">';
  html += '<div class="dp-head">';
  html += '<button class="dp-nav dp-prev" type="button">&lsaquo;</button>';
  html += '<button class="dp-title drp-month-title" type="button" data-side="'+side+'">'+window.Ledger._drpMonthNames[m]+' '+y+'</button>';
  html += '<button class="dp-nav dp-next" type="button">&rsaquo;</button>';
  html += '</div>';

  /* Month grid overlay (hidden by default) */
  html += '<div class="drp-month-grid" data-side="'+side+'" style="display:none;">';
  html += '<div class="drp-month-grid-head">';
  html += '<button class="dp-nav dp-prev drp-year-prev" type="button">&lsaquo;</button>';
  html += '<span class="drp-year-title">'+y+'</span>';
  html += '<button class="dp-nav dp-next drp-year-next" type="button">&rsaquo;</button>';
  html += '</div><div class="drp-month-grid-body">';
  for(var mi=0;mi<12;mi++){
    html += '<button type="button" class="drp-month-cell'+(mi===m?' current':'')+'" data-month="'+mi+'">'+window.Ledger._drpShortMonths[mi]+'</button>';
  }
  html += '</div></div>';

  /* Calendar grid */
  html += '<div class="dp-grid">';
  for(var d=0;d<7;d++) html += '<div class="dp-dow">'+window.Ledger._drpDayNames[d]+'</div>';
  for(var i=0;i<firstDay;i++) html += '<div class="dp-day dp-empty"></div>';
  for(var d=1;d<=daysInMonth;d++){
    var dt = new Date(y,m,d); dt.setHours(0,0,0,0);
    var iso = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var cls = "dp-day";
    if(todayDate && dt.getTime()===todayDate.getTime()) cls += " today";
    if(fromDate && dt.getTime()===fromDate.getTime()) cls += " range-start";
    if(toDate && dt.getTime()===toDate.getTime()) cls += " range-end";
    if(fromDate && toDate && dt>fromDate && dt<toDate) cls += " in-range";
    html += '<button class="'+cls+'" type="button" data-date="'+iso+'" data-side="'+side+'">'+d+'</button>';
  }
  html += '</div></div>';
  return html;
};

/* ---- Main entry point ---- */
window.Ledger.openDateRangePicker = function(opts){
  var existing = document.querySelector(".drp-popover");
  if(existing) existing.remove();

  var from = opts.from || "";
  var to = opts.to || "";
  var anchorEl = opts.anchorEl;
  var onApply = opts.onApply || function(){};
  var onCancel = opts.onCancel || function(){};

  var today = new Date(); today.setHours(0,0,0,0);
  var todayISO = window.Ledger._drpISO(today);

  /* Initialize left / right months */
  var leftMonth = from ? new Date(from+"T00:00:00") : new Date(today.getFullYear(), today.getMonth(), 1);
  var rightMonth = to ? new Date(to+"T00:00:00") : new Date(today.getFullYear(), today.getMonth()+1, 1);
  if(from && to){
    var fd=new Date(from+"T00:00:00"), td=new Date(to+"T00:00:00");
    if(fd.getFullYear()===td.getFullYear() && fd.getMonth()===td.getMonth()){
      rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1, 1);
    }
  }

  var popover = document.createElement("div");
  popover.className = "drp-popover";

  function render(){
    var fromDisplay = from ? window.Ledger.dpFormatDate(from) : "Select start";
    var toDisplay = to ? window.Ledger.dpFormatDate(to) : "Select end";

    popover.innerHTML = ''
      + '<div class="drp-chips">'
      + '<button type="button" class="drp-chip" data-range="7">Last 7 days</button>'
      + '<button type="button" class="drp-chip" data-range="30">Last 30 days</button>'
      + '<button type="button" class="drp-chip" data-range="90">Last 90 days</button>'
      + '<button type="button" class="drp-chip" data-range="ytd">Year to date</button>'
      + '</div>'
      + '<div class="drp-inputs">'
      + '<div class="drp-input-group">'
      + '<span class="drp-input-label">From</span>'
      + '<input type="text" class="drp-input drp-input-from" value="'+window.Ledger.escapeHtml(fromDisplay)+'" placeholder="MM/DD/YYYY">'
      + '</div>'
      + '<span class="drp-input-sep">&rarr;</span>'
      + '<div class="drp-input-group">'
      + '<span class="drp-input-label">To</span>'
      + '<input type="text" class="drp-input drp-input-to" value="'+window.Ledger.escapeHtml(toDisplay)+'" placeholder="MM/DD/YYYY">'
      + '</div>'
      + '</div>'
      + '<div class="drp-calendars">'
      + window.Ledger._drpCalHTML(leftMonth,"left",from,to,todayISO)
      + window.Ledger._drpCalHTML(rightMonth,"right",from,to,todayISO)
      + '</div>'
      + '<div class="drp-foot">'
      + '<button type="button" class="btn btn-sm drp-cancel">Cancel</button>'
      + '<button type="button" class="btn btn-sm btn-primary drp-apply">Apply range</button>'
      + '</div>';

    wireAll();
  }

  function wireAll(){
    /* ---- Quick-jump chips ---- */
    Array.prototype.forEach.call(popover.querySelectorAll(".drp-chip"), function(chip){
      chip.addEventListener("click", function(e){
        e.stopPropagation();
        var range = chip.getAttribute("data-range");
        var f = new Date(today), t = new Date(today);
        if(range==="ytd"){ f = new Date(today.getFullYear(),0,1); }
        else { f.setDate(f.getDate()-parseInt(range)+1); }
        from = window.Ledger._drpISO(f);
        to = window.Ledger._drpISO(t);
        leftMonth = new Date(f.getFullYear(), f.getMonth(), 1);
        rightMonth = new Date(t.getFullYear(), t.getMonth(), 1);
        if(leftMonth.getTime()===rightMonth.getTime()) rightMonth.setMonth(rightMonth.getMonth()+1);
        render();
      });
    });

    /* ---- Editable text inputs ---- */
    var inputFrom = popover.querySelector(".drp-input-from");
    var inputTo = popover.querySelector(".drp-input-to");
    if(inputFrom) inputFrom.addEventListener("keydown", function(e){
      if(e.key==="Enter"){ e.preventDefault(); var p=window.Ledger._drpParseInput(inputFrom.value.trim()); if(p) from=p; render(); }
    });
    if(inputTo) inputTo.addEventListener("keydown", function(e){
      if(e.key==="Enter"){ e.preventDefault(); var p=window.Ledger._drpParseInput(inputTo.value.trim()); if(p) to=p; render(); }
    });

    /* ---- Calendar month nav arrows ---- */
    ["left","right"].forEach(function(side){
      var cal = popover.querySelector('.drp-calendar[data-side="'+side+'"]');
      if(!cal) return;
      var month = side==="left" ? leftMonth : rightMonth;
      cal.querySelector(".dp-prev").addEventListener("click", function(e){ e.stopPropagation(); month.setMonth(month.getMonth()-1); render(); });
      cal.querySelector(".dp-next").addEventListener("click", function(e){ e.stopPropagation(); month.setMonth(month.getMonth()+1); render(); });
    });

    /* ---- Day clicks ---- */
    Array.prototype.forEach.call(popover.querySelectorAll(".dp-day:not(.dp-empty)"), function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var val = btn.getAttribute("data-date");
        if(!from || (from && to)){
          /* Start new range */
          from = val; to = "";
          leftMonth = new Date(val+"T00:00:00"); leftMonth.setDate(1);
          rightMonth = new Date(leftMonth); rightMonth.setMonth(rightMonth.getMonth()+1);
        } else {
          /* Complete range */
          to = val;
          rightMonth = new Date(val+"T00:00:00"); rightMonth.setDate(1);
          if(to < from){ var tmp=from; from=to; to=tmp; var tm=new Date(leftMonth); leftMonth=new Date(rightMonth); rightMonth=tm; }
          if(leftMonth.getFullYear()===rightMonth.getFullYear() && leftMonth.getMonth()===rightMonth.getMonth()) rightMonth.setMonth(rightMonth.getMonth()+1);
        }
        render();
      });
    });

    /* ---- Month title clicks (open month grid) ---- */
    Array.prototype.forEach.call(popover.querySelectorAll(".drp-month-title"), function(title){
      title.addEventListener("click", function(e){
        e.stopPropagation();
        var side = title.getAttribute("data-side");
        var grid = popover.querySelector('.drp-month-grid[data-side="'+side+'"]');
        var isVisible = grid && grid.style.display !== "none";
        Array.prototype.forEach.call(popover.querySelectorAll(".drp-month-grid"), function(g){ g.style.display="none"; });
        if(!isVisible && grid) grid.style.display = "";
      });
    });

    /* ---- Year nav in month grid ---- */
    Array.prototype.forEach.call(popover.querySelectorAll(".drp-year-prev"), function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var grid = btn.closest(".drp-month-grid");
        var side = grid.getAttribute("data-side");
        var month = side==="left" ? leftMonth : rightMonth;
        var yt = btn.parentElement.querySelector(".drp-year-title");
        var y = parseInt(yt.textContent)-1; yt.textContent = y; month.setFullYear(y);
        refreshMonthCells(grid, month);
      });
    });
    Array.prototype.forEach.call(popover.querySelectorAll(".drp-year-next"), function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var grid = btn.closest(".drp-month-grid");
        var side = grid.getAttribute("data-side");
        var month = side==="left" ? leftMonth : rightMonth;
        var yt = btn.parentElement.querySelector(".drp-year-title");
        var y = parseInt(yt.textContent)+1; yt.textContent = y; month.setFullYear(y);
        refreshMonthCells(grid, month);
      });
    });

    /* ---- Month cell clicks ---- */
    wireMonthCells(popover);

    /* ---- Footer ---- */
    popover.querySelector(".drp-cancel").addEventListener("click", function(e){ e.stopPropagation(); close(); onCancel(); });
    popover.querySelector(".drp-apply").addEventListener("click", function(e){
      e.stopPropagation();
      if(from && to && from > to){ var tmp=from; from=to; to=tmp; }
      close(); onApply(from, to);
    });
  }

  function wireMonthCells(root){
    Array.prototype.forEach.call(root.querySelectorAll(".drp-month-cell"), function(cell){
      cell.addEventListener("click", function(e){
        e.stopPropagation();
        var g = cell.closest(".drp-month-grid");
        var side = g.getAttribute("data-side");
        var mi = parseInt(cell.getAttribute("data-month"));
        (side==="left" ? leftMonth : rightMonth).setMonth(mi);
        render();
      });
    });
  }

  function refreshMonthCells(grid, month){
    var curM = month.getMonth();
    var body = grid.querySelector(".drp-month-grid-body");
    body.innerHTML = window.Ledger._drpShortMonths.map(function(nm,i){
      return '<button type="button" class="drp-month-cell'+(i===curM?' current':'')+'" data-month="'+i+'">'+nm+'</button>';
    }).join("");
    wireMonthCells(body);
  }

  function close(){
    popover.remove();
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKey);
  }
  function onDocClick(e){ if(!popover.contains(e.target)){ close(); onCancel(); } }
  function onKey(e){ if(e.key==="Escape"){ close(); onCancel(); } }

  /* Position below anchor */
  popover.style.position = "fixed";
  popover.style.zIndex = "10000";
  document.body.appendChild(popover);

  if(anchorEl){
    var rect = anchorEl.getBoundingClientRect();
    popover.style.top = (rect.bottom + 6) + "px";
    popover.style.left = rect.left + "px";
    requestAnimationFrame(function(){
      var pr = popover.getBoundingClientRect();
      if(pr.right > window.innerWidth - 16) popover.style.left = Math.max(16, window.innerWidth - pr.width - 16) + "px";
      if(pr.bottom > window.innerHeight - 16) popover.style.top = (rect.top - pr.height - 6) + "px";
    });
  }

  render();
  setTimeout(function(){ document.addEventListener("click", onDocClick); document.addEventListener("keydown", onKey); }, 0);
};
