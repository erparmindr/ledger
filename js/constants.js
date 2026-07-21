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
  {cat:"Food", words:["tim hortons","timhortons","starbucks","mcdonald","mcdonalds","subway","wendy","burger king","kfc","pizza","dominos","doordash","uber eats","ubereats","skipthedishes","restaurant","cafe","diner"]},
  {cat:"Groceries", words:["walmart","wal-mart","costco","foodbasics","food basics","loblaws","sobeys","metro","superstore","no frills","safeway","kroger","trader joe","whole foods","aldi"]},
  {cat:"Car", words:["shell","esso","petro-canada","petro canada","chevron","exxon","mobil","gas station","parking","auto insurance","car wash","canadian tire"]},
  {cat:"Shopping", words:["amazon","target","best buy","bestbuy","dollarama","gap ","old navy","winners","marshalls","ikea","apple.com","apple store"]},
  {cat:"Entertainment", words:["netflix","spotify","disney","hulu","prime video","cinema","movie","theatre","theater","steam","playstation","xbox"]},
  {cat:"Health", words:["shoppers drug mart","shoppersdrugmart","pharmacy","optometry","optical","dental","dentist","clinic","hospital","healthcare"]},
  {cat:"Housing", words:["rent","mortgage","property tax"]},
  {cat:"Utilities", words:["hydro","electricity","water bill","internet","rogers","bell canada","telus","comcast","at&t","verizon"]},
  {cat:"Travel", words:["expedia","airbnb","booking.com","air canada","westjet","delta air","united airlines","hotel","marriott","hilton"]},
  {cat:"Salary", words:["payroll","salary","direct deposit"]},
  {cat:"Cashback / Rewards", words:["cashback","cash back","rebate","reward"]}
];

window.Ledger.learnedCategoryKey = function learnedCategoryKey(desc) {
  return desc.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
};

window.Ledger.suggestCategoryForDescription = function suggestCategoryForDescription(desc, forType, DB, findCategory) {
  if(!desc) return null;
  var descLower = desc.toLowerCase();

  // 1. Learned mappings (user corrections from previous imports)
  if(DB.categoryLearning){
    var keys = Object.keys(DB.categoryLearning);
    for(var i=0;i<keys.length;i++){
      if(descLower.indexOf(keys[i]) !== -1){
        var learnedCatId = DB.categoryLearning[keys[i]];
        var cat = findCategory(learnedCatId);
        if(cat && cat.type === forType) return learnedCatId;
      }
    }
  }

  // 2. Built-in keyword list
  var AUTO_CATEGORY_KEYWORDS = window.Ledger.AUTO_CATEGORY_KEYWORDS;
  for(var j=0;j<AUTO_CATEGORY_KEYWORDS.length;j++){
    var entry = AUTO_CATEGORY_KEYWORDS[j];
    for(var k=0;k<entry.words.length;k++){
      if(descLower.indexOf(entry.words[k]) !== -1){
        var match = DB.categories.find(function(c){ return c.name === entry.cat && c.type === forType; });
        if(match) return match.id;
      }
    }
  }
  return null;
};

window.Ledger.rankCategorySuggestions = function(desc, forType, DB, findCategory) {
  if(!desc || desc.length < 2) return [];
  var descLower = desc.toLowerCase();
  var scores = {};

  if(DB.categoryLearning){
    var lKeys = Object.keys(DB.categoryLearning);
    for(var i=0;i<lKeys.length;i++){
      if(descLower.indexOf(lKeys[i]) !== -1){
        var cat = findCategory(DB.categoryLearning[lKeys[i]]);
        if(cat && cat.type === forType){
          scores[cat.id] = (scores[cat.id]||0) + 10;
        }
      }
    }
  }

  var AUTO = window.Ledger.AUTO_CATEGORY_KEYWORDS;
  for(var j=0;j<AUTO.length;j++){
    var entry = AUTO[j];
    for(var k=0;k<entry.words.length;k++){
      if(descLower.indexOf(entry.words[k]) !== -1){
        var match = DB.categories.find(function(c){ return c.name === entry.cat && c.type === forType; });
        if(match) scores[match.id] = (scores[match.id]||0) + 5;
      }
    }
  }

  var words = descLower.replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(function(w){ return w.length >= 3; });
  var txns = DB.transactions || [];
  for(var t=0;t<txns.length;t++){
    var tx = txns[t];
    if(!tx.desc || tx.type !== forType || !tx.category) continue;
    var txDescLower = tx.desc.toLowerCase();
    var matched = false;
    for(var w=0;w<words.length;w++){
      if(txDescLower.indexOf(words[w]) !== -1){ matched = true; break; }
    }
    if(matched) scores[tx.category] = (scores[tx.category]||0) + 1;
  }

  var results = Object.keys(scores).map(function(catId){
    var cat = findCategory(catId);
    return cat ? { id:catId, name:cat.name, score:scores[catId] } : null;
  }).filter(Boolean);

  results.sort(function(a,b){ return b.score - a.score; });
  return results.slice(0, 3);
};
