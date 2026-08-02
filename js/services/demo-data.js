(function(){
window.Ledger = window.Ledger || {};

/* ============================================================
   DEMO DATA GENERATOR
   Builds ~12 months of realistic, deterministic sample data
   using the app's own data models (accounts, categories,
   people, transfers, splits, refunds, recurring, debt items).
   Everything is derived from a seeded PRNG so the same story
   is produced on every run.
   ============================================================ */

window.Ledger.DEMO_SEED = 20260731;

function mulberry32(seed){
  var a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

window.Ledger.generateDemoData = function(){
  var rand = mulberry32(window.Ledger.DEMO_SEED);
  var pad2 = window.Ledger.pad2;

  /* ---- deterministic random helpers ---- */
  function rnd(){ return rand(); }
  function rndBetween(min, max){ return min + rnd() * (max - min); }
  function rndInt(min, max){ return Math.floor(rndBetween(min, max + 1)); }
  function round2(n){ return Math.round(n * 100) / 100; }
  function pick(arr){ return arr[Math.floor(rnd() * arr.length)]; }
  function iso(y, m, d){ return y + "-" + pad2(m) + "-" + pad2(d); }
  function addDays(isoStr, n){
    var d = new Date(isoStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function daysIn(y, m){ return new Date(y, m, 0).getDate(); }

  var now = new Date();
  var todayY = now.getFullYear();
  var todayM = now.getMonth() + 1;
  var todayD = now.getDate();
  var today = iso(todayY, todayM, todayD);
  var nowTs = new Date(today + "T00:00:00").getTime();

  /* Demo window: 12 months back from today, month-aligned */
  var startY = todayY, startM = todayM - 12;
  if(startM <= 0){ startM += 12; startY--; }
  var startTs = new Date(iso(startY, startM, 1) + "T00:00:00").getTime();

  var idSeq = 0;
  function nextId(prefix){ idSeq++; return prefix + "-" + ("0000" + idSeq).slice(-4); }

  /* ---- Categories: canonical defaults + realistic subcategories ---- */
  var categories = window.Ledger.defaultCategories();
  categories.forEach(function(c, ci){
    c.id = "cat-" + ("0000" + (ci + 1)).slice(-4);
    c.subs.forEach(function(s, si){ s.id = c.id + "-" + ("00" + (si + 1)).slice(-2); });
  });
  var catMap = {};
  categories.forEach(function(c){ catMap[c.name] = c; });

  var EXTRA_SUBS = {
    "Food": ["Restaurants", "Groceries"],
    "Car": ["Parking", "Rideshare"],
    "Housing": ["Rent", "Mortgage", "Property"],
    "Utilities": ["Electricity", "Internet", "Phone", "Water"],
    "Health": ["Pharmacy", "Medical", "Fitness"],
    "Shopping": ["Online", "Retail", "Clothing", "Electronics", "Gifts"],
    "Entertainment": ["Subscriptions", "Events"],
    "Travel": ["Flights", "Hotels", "Transport"],
    "Salary": ["Paycheck", "Bonus"],
    "Cashback / Rewards": ["Cashback"],
    "Other Income": ["Freelance"],
    "Other": ["Bank Fees", "Donations", "Miscellaneous"]
  };
  Object.keys(EXTRA_SUBS).forEach(function(name){
    var cat = catMap[name];
    if(!cat) return;
    var existing = {};
    cat.subs.forEach(function(s){ existing[s.name] = true; });
    EXTRA_SUBS[name].forEach(function(subName){
      if(!existing[subName]){
        cat.subs.push({ id: cat.id + "-" + ("00" + (cat.subs.length + 1)).slice(-2), name: subName });
      }
    });
  });
  function catId(name){ var c = catMap[name]; return c ? c.id : ""; }
  function subId(catName, subName){
    var cat = catMap[catName];
    if(!cat) return "";
    var s = null;
    for(var i = 0; i < cat.subs.length; i++){ if(cat.subs[i].name === subName){ s = cat.subs[i]; break; } }
    return s ? s.id : "";
  }

  /* ---- Groups ---- */
  var grpMe = { id: nextId("grp"), name: "My Finances", created: startTs };
  var grpFam = { id: nextId("grp"), name: "Family", created: startTs };
  var groups = [grpMe, grpFam];

  /* ---- Accounts ---- */
  function account(name, type, currency, opening, ownerId){
    return { id: nextId("acct"), name: name, type: type, currency: currency, owner: ownerId,
      openingBalance: round2(opening), archived: false, reconciledBalance: null,
      reconciledAt: null, created: startTs };
  }
  var checking = account("Checking", "checking", "USD", 3400, grpMe.id);
  var savings = account("Savings", "savings", "USD", 8500, grpMe.id);
  var cc = account("Credit Card", "credit_card", "USD", -300, grpMe.id);
  var cash = account("Cash", "cash", "USD", 60, grpMe.id);
  var cadAcc = account("CAD Account", "checking", "CAD", 250, grpMe.id);
  var inrAcc = account("Family Savings", "savings", "INR", 50000, grpFam.id);
  var accounts = [checking, savings, cc, cash, cadAcc, inrAcc];

  /* Reconciliation state: most verified this month; the credit card was
     last verified a month ago so it surfaces the "needs verification" flow. */
  checking.reconciledAt = addDays(today, -2);
  savings.reconciledAt = addDays(today, -2);
  cash.reconciledAt = addDays(today, -2);
  cadAcc.reconciledAt = addDays(today, -10);
  inrAcc.reconciledAt = addDays(today, -3);
  cc.reconciledAt = addDays(today, -40);

  /* ---- People ---- */
  var alex = { id: nextId("per"), name: "Alex Chen", created: startTs };
  var riley = { id: nextId("per"), name: "Riley Patel", created: startTs };
  var sam = { id: nextId("per"), name: "Sam Rivera", created: startTs };
  var people = [alex, riley, sam];

  /* ---- Transaction builders ---- */
  var txs = [];
  function addTx(rec){
    rec.id = nextId("tx");
    if(!rec.created) rec.created = new Date(rec.date + "T00:00:00").getTime();
    txs.push(rec);
    return rec;
  }
  function addCategorized(type, accountId, date, amount, desc, cat, sub, extra){
    if(!date) return null;
    var rec = { type: type, date: date, amount: round2(amount), desc: desc, notes: "",
      account: accountId, category: cat ? catId(cat) : "", subcategory: sub ? subId(cat, sub) : "",
      created: new Date(date + "T00:00:00").getTime() };
    if(extra){ for(var k in extra){ if(extra.hasOwnProperty(k)) rec[k] = extra[k]; } }
    var tx = addTx(rec);
    if(accountId === cc.id){
      if(type === "expense") ccBal -= amount;
      else if(type === "refund") ccBal += amount;
    }
    return tx;
  }
  function transferRec(fromType, fromId, toType, toId, date, amount, desc, cat, extra){
    if(!date) return null;
    var rec = { type: "transfer", date: date, amount: round2(amount), desc: desc, notes: "",
      fromType: fromType, fromId: fromId, toType: toType, toId: toId,
      category: cat ? catId(cat) : "", subcategory: "",
      created: new Date(date + "T00:00:00").getTime() };
    if(extra){ for(var k in extra){ if(extra.hasOwnProperty(k)) rec[k] = extra[k]; } }
    return addTx(rec);
  }
  function linkedTransfer(fromAcc, toAcc, date, fromAmount, toAmount, desc, cat){
    if(!date) return;
    var linkId = nextId("link");
    addTx({ type: "expense", date: date, amount: round2(fromAmount), desc: desc + " \u2192 " + toAcc.name, notes: "",
      account: fromAcc.id, category: catId(cat), subcategory: "",
      linkId: linkId, linkRole: "out", linkCurrency: toAcc.currency,
      created: new Date(date + "T00:00:00").getTime() });
    addTx({ type: "income", date: date, amount: round2(toAmount), desc: desc + " \u2190 " + fromAcc.name, notes: "",
      account: toAcc.id, category: catId(cat), subcategory: "",
      linkId: linkId, linkRole: "in", linkCurrency: fromAcc.currency,
      created: new Date(date + "T00:00:00").getTime() });
  }
  function debtItem(sourceTxId, personId, description, amount, currency, date, status, settledDate){
    var rec = { id: nextId("debt"), sourceTransactionId: sourceTxId, personId: personId || null,
      description: description, amount: round2(amount), currency: currency,
      status: status || "open", date: date, created: new Date(date + "T00:00:00").getTime() };
    if(settledDate) rec.settledDate = settledDate;
    return rec;
  }

  /* ---- merchants ---- */
  var GROCERY_STORES = ["Walmart", "Loblaws", "Sobeys", "No Frills", "Costco"];
  var GAS_STATIONS = ["Shell", "Petro-Canada", "Esso", "Chevron"];
  var EAT = ["Starbucks", "Tim Hortons", "McDonald's", "Chipotle", "Subway", "Pizza Pizza", "DoorDash", "Swiss Chalet"];
  var EAT_CASH = ["Street coffee", "Lunch cart", "Bakery"];
  var ENTERTAIN = ["Cineplex", "Ticketmaster", "Steam", "PlayStation Store"];
  var CLOTHING = ["Old Navy", "H&M", "Winners", "Nike"];
  var MEDICAL = ["Eye Exam — Vision Centre", "Physio — clinic", "Walk-in clinic"];

  /* ---- running state ---- */
  var ccBal = -300;                      // credit card balance (negative = owing); kept in sync by addCategorized
  var debtItems = [];
  var captures = {};                    // holds split-dinner references for post-loop debt tracking

  function generateMonth(y, m, lastDay){
    var relIdx = (y - startY) * 12 + (m - startM); // 0-based month in window
    var isLastMonth = (y === todayY && m === todayM);
    function d(n){ return n > lastDay ? null : iso(y, m, n); }
    function rndDay(){ return rndInt(1, Math.max(1, lastDay)); }

    /* ---- Income ---- */
    if(d(1)) addCategorized("income", checking.id, d(1), 5200, "Payroll deposit", "Salary", "Paycheck");
    if(relIdx % 2 === 1){ var fd = d(rndInt(10, 20)); if(fd) addCategorized("income", checking.id, fd, round2(rndBetween(300, 900)), "Freelance — invoice payment", "Other Income", "Freelance"); }
    if(m === 4 && d(15)) addCategorized("income", checking.id, d(15), 1800, "Tax refund", "Other Income", "");
    if(m === 12 && d(15)) addCategorized("income", checking.id, d(15), 3500, "Year-end bonus", "Salary", "Bonus");
    if(d(28)) addCategorized("income", savings.id, d(28), round2(rndBetween(6, 40)), "Savings interest", "Interest", "");
    if(d(28)) addCategorized("income", inrAcc.id, d(28), round2(rndBetween(150, 260)), "Interest credit", "Interest", "");

    /* ---- Fixed bills (Checking) ---- */
    if(m === 8){
      var hydroDay = d(10);
      if(hydroDay){ var hydroAug = addCategorized("expense", checking.id, hydroDay, 118.4, "Hydro One — electricity", "Utilities", "Electricity");
        if(hydroAug && d(20)) addCategorized("refund", checking.id, d(20), 45, "Refund — hydro overcharge", "Utilities", "Electricity", { refundOf: hydroAug.id });
      }
    }
    else if(d(10)) addCategorized("expense", checking.id, d(10), round2(rndBetween(95, 125)), "Hydro One — electricity", "Utilities", "Electricity");
    if(d(12)) addCategorized("expense", checking.id, d(12), 79.99, "Rogers — internet", "Utilities", "Internet");
    if(d(18)) addCategorized("expense", checking.id, d(18), 54.5, "Fido — mobile", "Utilities", "Phone");
    if(d(20)) addCategorized("expense", checking.id, d(20), 145, "TD Auto insurance", "Car", "Auto insurance");
    if(d(25)) addCategorized("expense", checking.id, d(25), 12, "Monthly account fee", "Other", "Bank Fees");
    if(relIdx % 4 === 1){ var dd = d(rndInt(6, 24)); if(dd) addCategorized("expense", checking.id, dd, round2(rndBetween(25, 100)), "Donation — Canadian Red Cross", "Other", "Donations"); }

    /* ---- Subscriptions (Credit Card) ---- */
    if(d(3)) addCategorized("expense", cc.id, d(3), 15.99, "Netflix", "Entertainment", "Subscriptions");
    if(d(4)) addCategorized("expense", cc.id, d(4), 11.99, "Spotify", "Entertainment", "Subscriptions");
    if(d(5)) addCategorized("expense", cc.id, d(5), 2.99, "Apple.com/bill — iCloud", "Entertainment", "Subscriptions");
    if(d(2)) addCategorized("expense", cc.id, d(2), 45, "GoodLife Fitness", "Health", "Fitness");
    if(d(2)) addCategorized("expense", cc.id, d(2), 128.45, "Presto — monthly transit pass", "Travel", "Transport");

    /* ---- Groceries + gas (Credit Card) ---- */
    var gDays = [4, 11, 18, 25];
    for(var gi = 0; gi < gDays.length; gi++){
      var gd = gDays[gi];
      if(!d(gd)) continue;
      addCategorized("expense", cc.id, d(gd), round2(rndBetween(55, 150)), pick(GROCERY_STORES), "Groceries", "Groceries");
    }
    if(m === 12 && d(15)) addCategorized("expense", cc.id, d(15), round2(rndBetween(220, 280)), "Walmart — holiday groceries", "Groceries", "Groceries");
    var fuelDays = [5, 12, 19, 26];
    for(var fi = 0; fi < fuelDays.length; fi++){
      var fdn = fuelDays[fi];
      if(!d(fdn)) continue;
      addCategorized("expense", cc.id, d(fdn), round2(rndBetween(38, 65)), pick(GAS_STATIONS), "Car", "Gas");
    }

    /* ---- Restaurants & coffee (Credit Card) ---- */
    var eatCount = rndInt(6, 10) + (m === 12 ? 3 : 0);
    for(var i = 0; i < eatCount; i++){
      addCategorized("expense", cc.id, d(rndDay()), round2(rndBetween(9, m === 12 ? 55 : 42)), pick(EAT), "Food", "Restaurants");
    }

    /* ---- Cash spending ---- */
    var weekStart = 1;
    while(weekStart <= lastDay){
      if(d(weekStart)) addCategorized("expense", cash.id, d(weekStart), round2(rndBetween(4, 6)), pick(EAT_CASH), "Food", "Restaurants");
      if(d(weekStart + 3)) addCategorized("expense", cash.id, d(weekStart + 3), round2(rndBetween(10, 14)), "Lunch cart", "Food", "Restaurants");
      weekStart += 7;
    }
    addCategorized("expense", cash.id, d(rndDay()), round2(rndBetween(5, 12)), "Corner store", "", "");

    /* ---- Entertainment ---- */
    var entCount = rndInt(2, 3);
    for(var j = 0; j < entCount; j++){
      addCategorized("expense", cc.id, d(rndDay()), round2(rndBetween(12, m === 12 ? 90 : 60)), pick(ENTERTAIN), "Entertainment", "Events");
    }

    /* ---- Shopping ---- */
    if(m === 1){
      var amzJan = addCategorized("expense", cc.id, d(3), 49.99, "Amazon.ca", "Shopping", "Online");
      if(amzJan && d(10)) addCategorized("refund", cc.id, d(10), 49.99, "Refund — Amazon.ca", "Shopping", "Online", { refundOf: amzJan.id, notes: "Returned item" });
    }
    else if(m === 10){
      var amzOct = addCategorized("expense", cc.id, d(3), 27.99, "Amazon.ca", "Shopping", "Online");
      if(amzOct && d(8)) addCategorized("refund", cc.id, d(8), 27.99, "Refund — Amazon.ca", "Shopping", "Online", { refundOf: amzOct.id });
    }
    else { var sd = d(rndInt(6, 26)); if(sd) addCategorized("expense", cc.id, sd, round2(rndBetween(25, 90)), "Amazon.ca", "Shopping", "Online"); }
    if(m === 3){
      var nav = addCategorized("expense", cc.id, d(2), 89.5, "Old Navy", "Shopping", "Clothing");
      if(nav && d(9)) addCategorized("refund", cc.id, d(9), 89.5, "Refund — Old Navy", "Shopping", "Clothing", { refundOf: nav.id });
    }
    else if(relIdx % 3 === 1){
      var cd = d(rndInt(6, 26)); if(cd) addCategorized("expense", cc.id, cd, round2(rndBetween(100, 250)), pick(CLOTHING), "Shopping", "Clothing");
    }
    if(relIdx === 9){ var eDay = d(22); if(eDay) addCategorized("expense", cc.id, eDay, round2(rndBetween(250, 420)), "Best Buy — headphones", "Shopping", "Electronics"); }
    if(relIdx === 10){ var pDay = d(18); if(pDay) addCategorized("expense", cc.id, pDay, 399.99, "Apple Store — phone case bundle", "Shopping", "Electronics"); }
    if(m === 12){ var gDay = d(rndInt(8, 20)); if(gDay) addCategorized("expense", cc.id, gDay, round2(rndBetween(120, 350)), "Holiday gifts", "Shopping", "Gifts"); }
    if(relIdx === 3 || relIdx === 8){ var bDay = d(rndInt(8, 20)); if(bDay) addCategorized("expense", cc.id, bDay, round2(rndBetween(50, 120)), "Birthday gift", "Shopping", "Gifts"); }

    /* ---- Health ---- */
    var pharm = d(rndInt(5, 25));
    if(pharm) addCategorized("expense", cc.id, pharm, round2(rndBetween(18, 55)), "Shoppers Drug Mart", "Health", "Pharmacy");
    if(relIdx === 6){ var med = d(12); if(med) addCategorized("expense", cc.id, med, 420, "City Dental — filling", "Health", "Medical"); }
    if(relIdx === 0 || relIdx === 5 || relIdx === 11){ var doc = d(rndInt(8, 22)); if(doc) addCategorized("expense", cc.id, doc, round2(rndBetween(120, 380)), pick(MEDICAL), "Health", "Medical"); }

    /* ---- Big one-off: car repair ---- */
    if(relIdx === 9){ var rep = d(14); if(rep) addCategorized("expense", cc.id, rep, 780, "Canadian Tire — brake service", "Car", "Maintenance"); }

    /* ---- Transportation ---- */
    var uberDay = d(rndInt(2, 28));
    if(uberDay) addCategorized("expense", cc.id, uberDay, round2(rndBetween(12, 28)), "Uber", "Car", "Rideshare");
    var park = d(rndInt(2, 28));
    if(park) addCategorized("expense", cc.id, park, round2(rndBetween(6, 18)), "Impark — parking", "Car", "Parking");

    /* ---- Savings & cash flow (transfers) ---- */
    if(d(2)) transferRec("account", checking.id, "account", savings.id, d(2), round2(rndBetween(350, 500)), "Transfer to savings", "Between My Accounts");
    if(d(1)) transferRec("account", checking.id, "account", cash.id, d(1), round2(rndBetween(100, 130)), "ATM withdrawal", "Between My Accounts");
    if(d(15)) transferRec("account", checking.id, "account", cash.id, d(15), round2(rndBetween(100, 130)), "ATM withdrawal", "Between My Accounts");

    /* ---- Credit card payment (paid in full) ---- */
    var payDay = d(26);
    if(payDay && !isLastMonth && ccBal <= -1){
      transferRec("account", checking.id, "account", cc.id, payDay, round2(-ccBal), "Credit card payment", "Credit Card Payment");
      ccBal = 0;
    }

    /* ---- Travel ---- */
    if(m === 7){
      if(d(3)) linkedTransfer(checking, cadAcc, d(3), 600, 822, "Vacation budget transfer", "Between My Accounts");
      if(d(5)) addCategorized("expense", cc.id, d(5), 420, "Air Canada — flights", "Travel", "Flights");
      if(d(6)) addCategorized("expense", cc.id, d(6), 684, "Marriott — hotel", "Travel", "Hotels");
      if(d(7)) addCategorized("expense", cc.id, d(7), 38, "Tour boat", "Entertainment", "Events");
      if(d(6)) addCategorized("expense", cadAcc.id, d(6), 96.4, "Fairmont — dining", "Food", "Restaurants");
      if(d(7)) addCategorized("expense", cadAcc.id, d(7), 32, "Royal Ontario Museum", "Entertainment", "Events");
      if(d(8)) addCategorized("expense", cadAcc.id, d(8), 16.5, "TTC — transit", "Travel", "Transport");
      if(d(9)) addCategorized("expense", cadAcc.id, d(9), 54.25, "Souvenir shop", "Shopping", "Retail");
      if(d(10)) addCategorized("expense", cadAcc.id, d(10), 8.95, "Tim Hortons", "Food", "Restaurants");
    }
    if(m === 9){
      if(d(20)) addCategorized("expense", cc.id, d(20), 224, "Flair Airlines — flights", "Travel", "Flights");
      if(d(21)) addCategorized("expense", cc.id, d(21), 268, "Holiday Inn — hotel", "Travel", "Hotels");
      if(d(22)) addCategorized("expense", cc.id, d(22), 34, "Uber", "Car", "Rideshare");
    }

    /* ---- Family remittance (cross-currency, USD → INR) ---- */
    if(relIdx === 3 && d(12)) linkedTransfer(checking, inrAcc, d(12), 250, 20750, "Family remittance", "Between My Accounts");
    if(relIdx === 9 && d(12)) linkedTransfer(checking, inrAcc, d(12), 200, 16600, "Family remittance", "Between My Accounts");

    /* ---- Unlinked refund (chargeback) ---- */
    if(m === 5 && d(18)) addCategorized("refund", cc.id, d(18), 129.99, "Dispute refund — duplicate charge", "Shopping", "Online", { notes: "Chargeback from issuer" });

    /* ---- Friend splits ---- */
    if(m === 6){ var dn = d(10); if(dn) captures.dinner = addCategorized("expense", cc.id, dn, 32, "Dinner — split with friends", "Food", "Restaurants", { friendSplit: { yourShare: 32, shares: [ {personId: alex.id, amount: 32}, {personId: riley.id, amount: 32} ] } }); }
    if(m === 12){ var hd = d(20); if(hd) captures.holidayDinner = addCategorized("expense", cc.id, hd, 40, "Holiday dinner — split", "Food", "Restaurants", { friendSplit: { yourShare: 40, shares: [ {personId: sam.id, amount: 40}, {personId: riley.id, amount: 40} ] } }); }

    /* ---- Loans between friends (person transfers) ---- */
    if(m === 3 && d(15)) transferRec("account", checking.id, "person", sam.id, d(15), 120, "Loan to Sam", "To Friend");
    if(m === 4 && d(8)) transferRec("person", sam.id, "account", checking.id, d(8), 120, "Repayment from Sam", "From Friend");

    /* ---- Category split (one Costco trip across categories) ---- */
    if(relIdx === 0){
      var cst = d(9);
      if(cst) addCategorized("expense", cc.id, cst, 185.62, "Costco Wholesale", "", "", { categorySplits: [
        { categoryId: catId("Groceries"), amount: 120 },
        { categoryId: catId("Shopping"), amount: 65.62 }
      ] });
    }
  }

  /* ---- generate each month in the window ---- */
  for(var y = startY, m = startM; y < todayY || (y === todayY && m <= todayM); ){
    var dim = daysIn(y, m);
    var lastDay = (y === todayY && m === todayM) ? todayD : dim;
    generateMonth(y, m, lastDay);
    m++;
    if(m > 12){ m = 1; y++; }
  }

  /* ---- pending transfer (awaiting destination) ---- */
  transferRec("account", checking.id, "account", "", addDays(today, -12), 250, "Wire transfer — destination pending", "Other Transfer", { pending: true });

  /* ---- friend split debt tracking ---- */
  if(captures.dinner){
    var dA = debtItem(captures.dinner.id, alex.id, captures.dinner.desc, 32, "USD", captures.dinner.date);
    var dR = debtItem(captures.dinner.id, riley.id, captures.dinner.desc, 32, "USD", captures.dinner.date);
    debtItems.push(dA, dR);
    var repayDate = addDays(captures.dinner.date, 7);
    transferRec("person", alex.id, "account", checking.id, repayDate, 32, "Repayment: " + captures.dinner.desc, "", { debtItemId: dA.id });
    dA.status = "settled";
    dA.settledDate = repayDate;
  }
  if(captures.holidayDinner){
    debtItems.push(debtItem(captures.holidayDinner.id, sam.id, captures.holidayDinner.desc, 40, "USD", captures.holidayDinner.date));
    debtItems.push(debtItem(captures.holidayDinner.id, riley.id, captures.holidayDinner.desc, 40, "USD", captures.holidayDinner.date));
  }

  /* ---- Recurring items (mix of auto-post and review) ---- */
  function recurring(name, type, accountId, amount, cat, sub, freq, postMode, startInDays){
    var s = addDays(today, startInDays);
    return { id: nextId("rec"), name: name, type: type, account: accountId, amount: round2(amount),
      category: cat ? catId(cat) : "", subcategory: sub ? subId(cat, sub) : "",
      frequency: freq, startDate: s, postMode: postMode, created: nowTs, anchorDay: parseInt(s.slice(8,10),10) };
  }
  var recurringItems = [
    recurring("Netflix", "expense", cc.id, 15.99, "Entertainment", "Subscriptions", "monthly", "auto", 12),
    recurring("Spotify", "expense", cc.id, 11.99, "Entertainment", "Subscriptions", "monthly", "auto", 13),
    recurring("Rent — Maple Apartments", "expense", checking.id, 1650, "Housing", "Rent", "monthly", "review", 14),
    recurring("GoodLife Fitness", "expense", cc.id, 45, "Health", "Fitness", "monthly", "review", 15),
    recurring("Rogers — internet", "expense", checking.id, 79.99, "Utilities", "Internet", "monthly", "review", 16),
    recurring("Fido — mobile", "expense", checking.id, 54.5, "Utilities", "Phone", "monthly", "review", 17),
    recurring("TD Auto insurance", "expense", checking.id, 145, "Car", "Auto insurance", "monthly", "review", 18),
    recurring("Payroll — Acme Corp", "income", checking.id, 5200, "Salary", "Paycheck", "monthly", "review", 19),
    recurring("Hydro One — electricity", "expense", checking.id, 105, "Utilities", "Electricity", "monthly", "review", 20),
    recurring("Grocery run", "expense", cc.id, 120, "Groceries", "Groceries", "weekly", "review", 7),
    recurring("Gas fill", "expense", cc.id, 52, "Car", "Gas", "weekly", "review", 8)
  ];

  /* ---- Category learning (auto-suggest on future imports) ---- */
  var categoryLearning = {};
  var subcategoryLearning = {};
  function learn(token, cat, sub){
    categoryLearning[token] = catId(cat);
    if(sub) subcategoryLearning[token] = { catId: catId(cat), subId: subId(cat, sub) };
  }
  learn("netflix", "Entertainment", "Subscriptions");
  learn("starbucks", "Food", "Restaurants");
  learn("costco", "Groceries", "Groceries");
  learn("amazon", "Shopping", "Online");
  learn("shell", "Car", "Gas");
  learn("payroll", "Salary", "Paycheck");

  /* ---- deterministic order: by date, then generation sequence ---- */
  txs.sort(function(a, b){
    if(a.date === b.date) return a.id < b.id ? -1 : 1;
    return a.date < b.date ? -1 : 1;
  });

  return {
    accounts: accounts,
    people: people,
    transactions: txs,
    categories: categories,
    recurring: recurringItems,
    debtItems: debtItems,
    groups: groups,
    categoryLearning: categoryLearning,
    subcategoryLearning: subcategoryLearning
  };
};

/* ============================================================
   LOAD DEMO DATA — replaces current data via the canonical path
   (same as restore-from-backup) and refreshes the UI.
   ============================================================ */
window.Ledger.loadDemoData = function(){
  var data = window.Ledger.generateDemoData();
  window.Ledger.replaceAllData(data);
  window.Ledger.navigateTo("overview");
  window.Ledger.showToast("Demo data loaded — " + data.transactions.length + " transactions across " + data.accounts.length + " accounts");
};

})();
