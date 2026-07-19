window.Ledger = window.Ledger || {};

window.Ledger.STORAGE_KEY = "ledger_app_v1";
window.Ledger.DB = null;
window.Ledger.currentPage = "overview";
window.Ledger.currentTheme = "dark";

window.Ledger.defaultCategories = function() {
  var uid = window.Ledger.uid;
  return [
    {id:uid(), name:"Food", type:"expense", subs:[]},
    {id:uid(), name:"Groceries", type:"expense", subs:[]},
    {id:uid(), name:"Car", type:"expense", subs:[{id:uid(), name:"Gas"},{id:uid(), name:"Auto insurance"},{id:uid(), name:"Maintenance"}]},
    {id:uid(), name:"Housing", type:"expense", subs:[]},
    {id:uid(), name:"Utilities", type:"expense", subs:[]},
    {id:uid(), name:"Health", type:"expense", subs:[]},
    {id:uid(), name:"Shopping", type:"expense", subs:[]},
    {id:uid(), name:"Entertainment", type:"expense", subs:[]},
    {id:uid(), name:"Travel", type:"expense", subs:[]},
    {id:uid(), name:"Loaned Out", type:"expense", subs:[]},
    {id:uid(), name:"Other", type:"expense", subs:[]},
    {id:uid(), name:"Salary", type:"income", subs:[]},
    {id:uid(), name:"Interest", type:"income", subs:[]},
    {id:uid(), name:"Cashback / Rewards", type:"income", subs:[]},
    {id:uid(), name:"Gift", type:"income", subs:[]},
    {id:uid(), name:"Loan Repayment", type:"income", subs:[]},
    {id:uid(), name:"Other Income", type:"income", subs:[]},
    {id:uid(), name:"Credit Card Payment", type:"transfer", subs:[]},
    {id:uid(), name:"Between My Accounts", type:"transfer", subs:[]},
    {id:uid(), name:"To Friend", type:"transfer", subs:[]},
    {id:uid(), name:"From Friend", type:"transfer", subs:[]},
    {id:uid(), name:"Other Transfer", type:"transfer", subs:[]}
  ];
};

window.Ledger.defaultData = function() {
  var uid = window.Ledger.uid;
  return {
    accounts:[
      {id:uid(), name:"Checking", type:"checking", currency:"USD", openingBalance:0, archived:false, created:Date.now()},
      {id:uid(), name:"Cash", type:"cash", currency:"USD", openingBalance:0, archived:false, created:Date.now()}
    ],
    people:[],
    transactions:[],
    categories:window.Ledger.defaultCategories(),
    recurring:[],
    debtItems:[],
    categoryLearning:{}
  };
};

window.Ledger.loadData = function() {
  var uid = window.Ledger.uid;
  var pad2 = window.Ledger.pad2;
  try{
    var raw = localStorage.getItem(window.Ledger.STORAGE_KEY);
    if(!raw) return window.Ledger.defaultData();
    var parsed = JSON.parse(raw);
    var d = window.Ledger.defaultData();
    var categories = parsed.categories || d.categories;
    categories = categories.map(function(c){
      if(!c.type) c.type = "expense";
      return c;
    });

    var recurring = parsed.recurring || [];
    recurring = recurring.map(function(r){
      if(!r.frequency){
        r.frequency = "monthly";
        var now = new Date();
        var day = r.day || 1;
        var y = now.getFullYear(), m = now.getMonth();
        var candidateDay = Math.min(day, new Date(y, m+1, 0).getDate());
        r.startDate = y + "-" + pad2(m+1) + "-" + pad2(candidateDay);
      }
      return r;
    });

    return {
      accounts: parsed.accounts || d.accounts,
      people: parsed.people || [],
      transactions: parsed.transactions || [],
      categories: categories,
      recurring: recurring,
      debtItems: parsed.debtItems || [],
      categoryLearning: parsed.categoryLearning || {}
    };
  }catch(e){
    console.error("Load failed, using defaults", e);
    return window.Ledger.defaultData();
  }
};

window.Ledger.saveData = function() {
  try{
    if(window.Ledger.Storage && window.Ledger.Storage.persist){
      window.Ledger.Storage.persist();
    } else {
      localStorage.setItem(window.Ledger.STORAGE_KEY, JSON.stringify(window.Ledger.DB));
    }
  }catch(e){
    console.error("Save failed", e);
    window.Ledger.showToast("Could not save — storage may be full");
  }
};

/* ============================================================
   MUTATION FUNCTIONS
   Single entry points for all state changes.
   Each function mutates DB, saves, and renders.
   ============================================================ */

// ---- Transactions ----

window.Ledger.addTransaction = function(tx, skipSave) {
  window.Ledger.DB.transactions.push(tx);
  if(!skipSave){
    window.Ledger.saveData();
    window.Ledger.renderPage();
  }
};

window.Ledger.addTransactionBatch = function(txArray, categoryLearning) {
  for(var i = 0; i < txArray.length; i++){
    window.Ledger.DB.transactions.push(txArray[i]);
  }
  if(categoryLearning){
    for(var k in categoryLearning){
      if(categoryLearning.hasOwnProperty(k)) window.Ledger.DB.categoryLearning[k] = categoryLearning[k];
    }
  }
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.updateTransaction = function(id, changes) {
  var idx = window.Ledger.DB.transactions.findIndex(function(x){ return x.id === id; });
  if(idx >= 0) Object.assign(window.Ledger.DB.transactions[idx], changes);
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.upsertTransaction = function(rec) {
  if(!rec || !rec.id) return;
  var idx = window.Ledger.DB.transactions.findIndex(function(x){ return x.id === rec.id; });
  if(idx >= 0) window.Ledger.DB.transactions[idx] = rec;
  else window.Ledger.DB.transactions.push(rec);
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.deleteTransaction = function(id) {
  window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.id !== id; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.deleteTransactionsByLink = function(linkId) {
  window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.linkId !== linkId; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

// ---- Accounts ----

window.Ledger.addAccount = function(acct) {
  window.Ledger.DB.accounts.push(acct);
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.updateAccount = function(rec) {
  var idx = window.Ledger.DB.accounts.findIndex(function(x){ return x.id === rec.id; });
  if(idx >= 0) window.Ledger.DB.accounts[idx] = rec;
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.archiveAccount = function(id) {
  var a = window.Ledger.findAccount(id);
  if(a) a.archived = true;
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Account archived");
};

window.Ledger.unarchiveAccount = function(id) {
  var a = window.Ledger.findAccount(id);
  if(a) a.archived = false;
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Account restored");
};

// ---- Categories ----

window.Ledger.addCategory = function(type, name) {
  window.Ledger.DB.categories.push({ id: window.Ledger.uid(), type: type, name: name, subs: [] });
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Category added");
};

window.Ledger.renameCategory = function(catId, name) {
  var cat = window.Ledger.DB.categories.find(function(c){ return c.id === catId; });
  if(cat) cat.name = name;
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.deleteCategory = function(catId) {
  window.Ledger.DB.categories = window.Ledger.DB.categories.filter(function(c){ return c.id !== catId; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Category deleted");
};

window.Ledger.addSubcategory = function(catId, name) {
  var cat = window.Ledger.DB.categories.find(function(c){ return c.id === catId; });
  if(cat){ cat.subs.push({ id: window.Ledger.uid(), name: name }); }
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Subcategory added");
};

window.Ledger.renameSubcategory = function(catId, subId, name) {
  var cat = window.Ledger.DB.categories.find(function(c){ return c.id === catId; });
  if(cat){
    var sub = cat.subs.find(function(s){ return s.id === subId; });
    if(sub) sub.name = name;
  }
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.deleteSubcategory = function(catId, subId) {
  var cat = window.Ledger.DB.categories.find(function(c){ return c.id === catId; });
  if(cat) cat.subs = cat.subs.filter(function(s){ return s.id !== subId; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Subcategory deleted");
};

// ---- Recurring ----

window.Ledger.addRecurring = function(obj) {
  window.Ledger.DB.recurring.push(obj);
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Recurring item added");
};

window.Ledger.deleteRecurring = function(id) {
  window.Ledger.DB.recurring = window.Ledger.DB.recurring.filter(function(r){ return r.id !== id; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

// ---- People ----

window.Ledger.addPerson = function(obj) {
  window.Ledger.DB.people.push(obj);
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Person added");
};

window.Ledger.updatePerson = function(rec) {
  var idx = window.Ledger.DB.people.findIndex(function(x){ return x.id === rec.id; });
  if(idx >= 0) window.Ledger.DB.people[idx] = rec;
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Person updated");
};

window.Ledger.deletePerson = function(id) {
  window.Ledger.DB.people = window.Ledger.DB.people.filter(function(p){ return p.id !== id; });
  window.Ledger.saveData();
  window.Ledger.renderPage();
  window.Ledger.showToast("Person deleted");
};

// ---- Debt Items ----

window.Ledger.replaceDebtItemsForTransaction = function(mainId, debtItems) {
  window.Ledger.DB.debtItems = window.Ledger.DB.debtItems.filter(function(d){ return d.sourceTransactionId !== mainId; });
  for(var i = 0; i < debtItems.length; i++){
    window.Ledger.DB.debtItems.push(debtItems[i]);
  }
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.updateDebtItem = function(id, changes, skipSave) {
  var d = window.Ledger.DB.debtItems.find(function(x){ return x.id === id; });
  if(!d) return;
  Object.assign(d, changes);
  if(!skipSave){
    window.Ledger.saveData();
    window.Ledger.renderPage();
  }
};

// ---- Category Learning ----

window.Ledger.learnCategory = function(desc, catId) {
  if(!desc || !catId) return;
  if(!window.Ledger.DB.categoryLearning) window.Ledger.DB.categoryLearning = {};
  var key = window.Ledger.learnedCategoryKey(desc);
  var firstToken = key.split(" ")[0] || "";
  if(firstToken.length >= 4){
    window.Ledger.DB.categoryLearning[firstToken] = catId;
  }
};

// ---- Full data replacement (reset, backup import) ----

window.Ledger.replaceAllData = function(data) {
  window.Ledger.DB.accounts = data.accounts || [];
  window.Ledger.DB.people = data.people || [];
  window.Ledger.DB.transactions = data.transactions || [];
  window.Ledger.DB.categories = data.categories || window.Ledger.defaultCategories();
  window.Ledger.DB.recurring = data.recurring || [];
  window.Ledger.DB.debtItems = data.debtItems || [];
  window.Ledger.DB.categoryLearning = data.categoryLearning || {};
  window.Ledger.saveData();
  window.Ledger.renderPage();
};

window.Ledger.DB = window.Ledger.loadData();
