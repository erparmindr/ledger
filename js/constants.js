window.Ledger = window.Ledger || {};

window.Ledger.CURRENCIES = ["USD","CAD","EUR","GBP","INR","AUD","JPY"];

window.Ledger.ACCOUNT_OWNERS = [
  {id:"me", label:"My Accounts", avatar:"M", cls:"avatar-me"},
  {id:"wife", label:"Wife's Accounts", avatar:"W", cls:"avatar-wife"}
];

window.Ledger.ACCOUNT_TYPES = [
  {id:"checking", label:"Checking"},
  {id:"savings", label:"Savings"},
  {id:"cash", label:"Cash"},
  {id:"credit_card", label:"Credit card"}
];

window.Ledger.DATE_PRESETS = [
  {id:"all", label:"All time"},
  {id:"today", label:"Today"},
  {id:"week", label:"This week"},
  {id:"month", label:"This month"},
  {id:"year", label:"This year"},
  {id:"custom", label:"Custom range"}
];

window.Ledger.AUTO_CATEGORY_KEYWORDS = [
  {cat:"Food", sub:"Restaurants", words:["tim hortons","timhortons","starbucks","mcdonald","mcdonalds","subway","wendy","burger king","kfc","pizza","dominos","doordash","uber eats","ubereats","skipthedishes","restaurant","cafe","diner","a&w","harvey","popeyes","five guys","chipotle","panera","boston pizza","swiss chalet","the keg","st hubert","mary browns","popeyes","tims","second cup","dutch bros","popeyes","pita pit","freshii","earls","milestones","joey","cactus club","montana","boston pizza"]},
  {cat:"Food", sub:"Groceries", words:["walmart","wal-mart","costco","foodbasics","food basics","loblaws","sobeys","metro","superstore","no frills","safeway","kroger","trader joe","whole foods","aldi","freshco","fresh co","longos","longos","valuation","iga","foodland","price chopper","sprouts","publix","wegmans","target grocery"]},
  {cat:"Car", sub:"Gas", words:["shell","esso","petro-canada","petro canada","chevron","exxon","mobil","gas station","ultramar","hawk petroleum","couche tard","circle k","sunoco","phillips 66","valero","bp ","shell "]},
  {cat:"Car", sub:"Parking", words:["parking","impark","easy park","diamond parking","parknp","spothero","parkwhiz"]},
  {cat:"Car", sub:"Maintenance", words:["auto insurance","car wash","canadian tire","mr lube","jiffy lube","oil changers","kal tire","dealer","dealership","auto shop","mechanic","tire","brake","oil change","ntb","firestone",".discount tire"]},
  {cat:"Car", sub:"Rideshare", words:["uber","lyft","fare","taxi","cab ","yellow cab","beck taxi"]},
  {cat:"Shopping", sub:"Online", words:["amazon","amzn","best buy","bestbuy","ebay","walmart.com","shopify","aliexpress","etsy","wayfair","overstock","newegg","target.com","costco.ca"]},
  {cat:"Shopping", sub:"Retail", words:["dollarama","dollar tree","dollarstore","canadian tire","home depot","home depot","rona","lowe","menards","ace hardware","hd "]},
  {cat:"Shopping", sub:"Clothing", words:["gap ","old navy","winners","marshalls","ikea","zara","hm ","h&m","uniqlo","lululeon","lululemon","nike","adidas","foot locker","roots","aritzia","forever 21","tj maxx","ross","sephora","ulta","bath and body"]},
  {cat:"Shopping", sub:"Electronics", words:["apple store","apple.com","best buy","bestbuy","microsoft store","google store","samsung","canada computers","memory express","micro center"]},
  {cat:"Entertainment", sub:"Subscriptions", words:["netflix","spotify","disney","disney+","hulu","prime video","youtube premium","youtube music","apple music","apple tv","crave","paramount","peacock","audible","apple arc"]},
  {cat:"Entertainment", sub:"Events", words:["cinema","movie","theatre","theater","steam","playstation","xbox","nintendo","ticketmaster","stubhub","live nation","seatgeek","amc","cineplex","fandango","game","gaming"]},
  {cat:"Health", sub:"Pharmacy", words:["shoppers drug mart","shoppersdrugmart","pharma plus","pharmasave","rexall","guardian","ida","lawtons","cvs","walgreens","rite aid"]},
  {cat:"Health", sub:"Medical", words:["dentist","clinic","hospital","optometry","optical","dental","healthcare","doctor","physio","chiropractor","massage therapy","lab ","blood work","medical","eye exam","vision"]},
  {cat:"Health", sub:"Fitness", words:["gym","fitness","planet fitness","goodlife","oranic","orangetheory","crossfit","yoga","peloton","membership","equinox","crunch","la fitness"]},
  {cat:"Housing", sub:"Rent", words:["rent","apartment","condo fee","maintenance fee"]},
  {cat:"Housing", sub:"Mortgage", words:["mortgage","home loan"]},
  {cat:"Housing", sub:"Property", words:["property tax","hoa ","home insurance","strata"]},
  {cat:"Utilities", sub:"Electricity", words:["hydro","electricity","power bill","enbridge","gas bill","natural gas"]},
  {cat:"Utilities", sub:"Internet", words:["internet","rogers","bell canada","telus","comcast","at&t","verizon","shaw","cogeco"," Distributel","fizz","public mobile","videotron","xfinity"]},
  {cat:"Utilities", sub:"Phone", words:["phone bill","cell","mobile","wireless","fido","koodo","virgin","sprint","t-mobile","cricket"]},
  {cat:"Utilities", sub:"Water", words:["water bill","water utility"]},
  {cat:"Travel", sub:"Flights", words:["air canada","westjet","delta air","united airlines","american airlines","southwest","jetblue","spirit air","flair","porter","swoop"]},
  {cat:"Travel", sub:"Hotels", words:["airbnb","booking.com","hotel","marriott","hilton","expedia","hyatt","best western","holiday inn","inn","hostel","vrbo"]},
  {cat:"Travel", sub:"Transport", words:["rental car","hertz","avis","enterprise","budget rent","turo","via rail","amtrak","greyhound","megabus","go transit","ttc","transit","presto"]},
  {cat:"Salary", sub:"Paycheck", words:["payroll","salary","direct deposit","wages","pay "]},
  {cat:"Salary", sub:"Bonus", words:["bonus","incentive","commission","profit sharing"]},
  {cat:"Income", sub:"Freelance", words:["freelance","contract","consulting","invoice","payment received","venmo","paypal","etransfer","e-transfer","interac"]},
  {cat:"Cashback / Rewards", sub:"Cashback", words:["cashback","cash back","rebate","reward","points","cash reward"]},
  {cat:"Education", sub:"Tuition", words:["tuition","university","college","school","student loan","osap","fafsa"]},
  {cat:"Education", sub:"Books", words:["textbook","indigo","chapters","books","kindle","chegg"]},
  {cat:"Personal", sub:"Gifts", words:["gift","present","shoppers gift","gift card"]},
  {cat:"Personal", sub:"Donations", words:["donation","charity","tithe","gofundme","red cross","unicef","salvation army"]},
  {cat:"Fees", sub:"Bank Fees", words:["service charge","monthly fee","overdraft","nsf","atm fee","bank fee","account fee"]},
  {cat:"Fees", sub:"Subscription Fees", words:["subscription","monthly plan","annual fee","membership fee"]}
];

/* Normalize merchant description for better keyword matching.
   Strips trailing numbers, common bank suffixes, normalizes whitespace. */
window.Ledger.normalizeMerchant = function normalizeMerchant(desc) {
  if(!desc) return "";
  return desc.toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(na|pur|pos|tfr|pm|dr|cr|POS PUR|POS WDL|INTERAC|DEBIT|CREDIT)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

window.Ledger.learnedCategoryKey = function learnedCategoryKey(desc) {
  var norm = window.Ledger.normalizeMerchant(desc);
  var words = norm.split(" ").filter(function(w){ return w.length >= 3; });
  return words[0] || norm;
};

window.Ledger.suggestCategoryForDescription = function suggestCategoryForDescription(desc, forType, DB, findCategory) {
  if(!desc) return null;
  var descLower = desc.toLowerCase();
  var norm = window.Ledger.normalizeMerchant(desc);
  var firstWord = norm.split(" ")[0] || "";

  // 1. Learned subcategory mappings
  if(DB.subcategoryLearning && firstWord.length >= 4){
    var subLearned = DB.subcategoryLearning[firstWord];
    if(subLearned){
      var sCat = findCategory(subLearned.catId);
      if(sCat && sCat.type === forType){
        var sub = (sCat.subs||[]).find(function(s){ return s.id === subLearned.subId; });
        if(sub) return { categoryId: subLearned.catId, subcategoryId: subLearned.subId };
      }
    }
  }

  // 2. Learned category mappings
  if(DB.categoryLearning){
    var keys = Object.keys(DB.categoryLearning);
    for(var i=0;i<keys.length;i++){
      if(norm.indexOf(keys[i]) !== -1 || descLower.indexOf(keys[i]) !== -1){
        var learnedCatId = DB.categoryLearning[keys[i]];
        var cat = findCategory(learnedCatId);
        if(cat && cat.type === forType) return { categoryId: learnedCatId, subcategoryId: null };
      }
    }
  }

  // 3. Built-in keyword list (subcategory-aware)
  var AUTO = window.Ledger.AUTO_CATEGORY_KEYWORDS;
  for(var j=0;j<AUTO.length;j++){
    var entry = AUTO[j];
    for(var k=0;k<entry.words.length;k++){
      var w = entry.words[k];
      if(norm.indexOf(w) !== -1 || descLower.indexOf(w) !== -1){
        var match = DB.categories.find(function(c){ return c.name === entry.cat && c.type === forType; });
        if(match){
          var subId = null;
          if(entry.sub && match.subs && match.subs.length){
            var subMatch = match.subs.find(function(s){ return s.name === entry.sub; });
            if(subMatch) subId = subMatch.id;
          }
          return { categoryId: match.id, subcategoryId: subId };
        }
      }
    }
  }
  return null;
};

window.Ledger.rankCategorySuggestions = function(desc, forType, DB, findCategory) {
  if(!desc || desc.length < 2) return [];
  var descLower = desc.toLowerCase();
  var norm = window.Ledger.normalizeMerchant(desc);
  var firstWord = norm.split(" ")[0] || "";
  var scores = {};
  var subMap = {};

  /* 1. Learned subcategory (strongest) */
  if(DB.subcategoryLearning && firstWord.length >= 4){
    var subLearned = DB.subcategoryLearning[firstWord];
    if(subLearned){
      var sCat = findCategory(subLearned.catId);
      if(sCat && sCat.type === forType){
        scores[sCat.id] = (scores[sCat.id]||0) + 15;
        subMap[sCat.id] = subLearned.subId;
      }
    }
  }

  /* 2. Learned category */
  if(DB.categoryLearning){
    var lKeys = Object.keys(DB.categoryLearning);
    for(var i=0;i<lKeys.length;i++){
      if(norm.indexOf(lKeys[i]) !== -1 || descLower.indexOf(lKeys[i]) !== -1){
        var cat = findCategory(DB.categoryLearning[lKeys[i]]);
        if(cat && cat.type === forType){
          scores[cat.id] = (scores[cat.id]||0) + 10;
        }
      }
    }
  }

  /* 3. Built-in keyword list */
  var AUTO = window.Ledger.AUTO_CATEGORY_KEYWORDS;
  for(var j=0;j<AUTO.length;j++){
    var entry = AUTO[j];
    for(var k=0;k<entry.words.length;k++){
      var w = entry.words[k];
      if(norm.indexOf(w) !== -1 || descLower.indexOf(w) !== -1){
        var match = DB.categories.find(function(c){ return c.name === entry.cat && c.type === forType; });
        if(match){
          scores[match.id] = (scores[match.id]||0) + 5;
          if(entry.sub && match.subs && match.subs.length && !subMap[match.id]){
            var subMatch = match.subs.find(function(s){ return s.name === entry.sub; });
            if(subMatch) subMap[match.id] = subMatch.id;
          }
        }
      }
    }
  }

  /* 4. Fuzzy word match from past transactions */
  var words = norm.replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(function(w){ return w.length >= 3; });
  var txns = DB.transactions || [];
  for(var t=0;t<txns.length;t++){
    var tx = txns[t];
    if(!tx.desc || tx.type !== forType || !tx.category) continue;
    var txNorm = window.Ledger.normalizeMerchant(tx.desc);
    var matched = false;
    for(var w=0;w<words.length;w++){
      if(txNorm.indexOf(words[w]) !== -1){ matched = true; break; }
    }
    if(matched){
      scores[tx.category] = (scores[tx.category]||0) + 1;
      if(tx.subcategory && !subMap[tx.category]) subMap[tx.category] = tx.subcategory;
    }
  }

  var results = Object.keys(scores).map(function(catId){
    var cat = findCategory(catId);
    return cat ? { id:catId, name:cat.name, score:scores[catId], subcategoryId: subMap[catId] || null } : null;
  }).filter(Boolean);

  results.sort(function(a,b){ return b.score - a.score; });
  return results.slice(0, 3);
};
