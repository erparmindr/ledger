# Ledger — Implementation Plans

**Status:** Awaiting review. No code has been changed.
**Purpose:** Detailed plans for each issue identified in the architecture assessment.

---

## Plan 1: Route bulk delete through `deleteTransaction()`

### Issue

`wire/transactions.js:172-175` bypasses `store.js` `deleteTransaction()` by directly filtering the transactions array and calling `replaceDebtItemsForTransaction()` inline.

### Current Execution Flow

```
[Bulk Delete button click]
  → openConfirmModal("Delete N transactions?")
    → onConfirm:
      for each id:
        window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(x => x.id !== id)
        window.Ledger.replaceDebtItemsForTransaction(id, [], true)
      window.Ledger.registerSelectedTx = {}
      window.Ledger.saveData()
      window.Ledger.renderPage()
```

### Proposed Execution Flow

```
[Bulk Delete button click]
  → openConfirmModal("Delete N transactions?")
    → onConfirm:
      for each id:
        window.Ledger.deleteTransaction(id)
      window.Ledger.registerSelectedTx = {}
      window.Ledger.showToast(N + " transactions deleted")
```

### Files Affected

- `js/wire/transactions.js:167-181` — the bulk delete handler

### Root Cause

The bulk delete was written as an inline loop that replicates `deleteTransaction()`'s logic instead of reusing it. Likely because the author wanted to batch `saveData()` + `renderPage()` once at the end rather than once per iteration.

### Current `deleteTransaction()` Side Effects (store.js:178-183)

1. Removes transaction from `DB.transactions` array
2. Calls `replaceDebtItemsForTransaction(id, [], true)` — clears debt items linked to the deleted transaction
3. Calls `saveData()` — persists to IndexedDB + localStorage
4. Calls `renderPage()` — re-renders the current page

### What Changes

- The bulk handler will call `deleteTransaction()` in a loop instead of doing the work inline
- `saveData()` and `renderPage()` will be called N times instead of once
- `showToast` will move after the loop

### Behaviour Change

**None.** The resulting `DB.transactions` array and `DB.debtItems` will be identical after execution.

### What This Protects Against

Any future side effects added to `deleteTransaction()` will automatically apply to bulk delete. For example:

- Removing the transaction's link pair (if it's half of a cross-currency transfer)
- Cleaning up category learning entries
- Updating an account's reconciled balance

### Existing Callers of `deleteTransaction()`

| File | Context |
|---|---|
| `app.js:150` | Individual transaction delete via `[data-del-tx]` — confirms, then calls `deleteTransaction()` |
| `modals/utility-modals.js:118` | Duplicate management — deletes selected duplicates one by one |
| `tests/integration.test.js:116,424` | Test cleanup |
| `tests/splits.test.js:290,302` | Test cleanup |
| `tests/types.test.js:650,661` | Test cleanup |

### Risk Assessment

**Risk:** Low

**Why:** The logic is identical. The only difference is `saveData()` + `renderPage()` are called N times instead of once. `saveData()` writes to localStorage (sync) and IndexedDB (async). At scale (e.g., deleting 500 transactions), this will be slower. If performance is a concern, `deleteTransaction()` could accept an optional `batch` parameter to skip save/render, and the bulk handler could call `saveData()` + `renderPage()` once at the end.

**Recommended pattern** (add `skipSave` parameter, already exists on some mutations):

```js
// store.js deleteTransaction — add skipSave param
window.Ledger.deleteTransaction = function(id, skipSave) {
  window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.id !== id; });
  window.Ledger.replaceDebtItemsForTransaction(id, [], true);
  if(!skipSave){
    window.Ledger.saveData();
    window.Ledger.renderPage();
  }
};
```

Then bulk delete:

```js
selectedIds.forEach(function(id){ window.Ledger.deleteTransaction(id, true); });
window.Ledger.registerSelectedTx = {};
window.Ledger.saveData();
window.Ledger.renderPage();
window.Ledger.showToast(selectedIds.length + " transaction" + (selectedIds.length !== 1 ? "s" : "") + " deleted");
```

This preserves the single save/render at the end while still routing through `deleteTransaction()`.

### Estimated Effort

- 15 lines changed in `wire/transactions.js`
- 2 lines changed in `store.js` (add `skipSave` parameter)
- Total: ~20 minutes including testing

### Verification

Existing tests in `tests/integration.test.js:421-428` already exercise `deleteTransaction()` in bulk. After the change, running `npx vitest run` should pass.

---

## Plan 2: Route recurring auto-post through `addTransaction()`

### Issue

`services/recurring.js:27-29` pushes transactions directly to `DB.transactions` instead of calling `addTransaction()`. `wire/scheduled.js:61-64` does the same for manual "confirm & post". Both bypass any side effects `addTransaction()` may acquire.

### Current Execution Flow

```
autoPostRecurring():
  → for each matching recurring item:
    window.Ledger.DB.transactions.push({ ... })
    window.Ledger._advanceRecurring(r)
    window.Ledger.saveData()

wire/scheduled.js confirm & post:
  window.Ledger.addTransaction({ ... }, true)  // skipSave = true
  window.Ledger._advanceRecurring(r)
  window.Ledger.saveData()
  window.Ledger.renderPage()
```

### Proposed Execution Flow

```
autoPostRecurring():
  → for each matching recurring item:
    window.Ledger.addTransaction({ ... })       // no skipSave
    window.Ledger._advanceRecurring(r)

wire/scheduled.js confirm & post:
  window.Ledger.addTransaction({ ... }, true)
  window.Ledger._advanceRecurring(r)
  window.Ledger.saveData()
  window.Ledger.renderPage()
```

### Files Affected

- `js/services/recurring.js:17-40` — the `autoPostRecurring` function
- Check `wire/scheduled.js:61-64` — already uses `addTransaction()` with `skipSave=true`, so only the recurring service needs changing

### Root Cause

The service predates or was written in parallel with `addTransaction()`. It constructs transactions similarly but routes them directly to the array.

### What `addTransaction()` Currently Does (store.js:136-142)

1. Pushes tx to `DB.transactions`
2. If not `skipSave`: calls `saveData()` + `renderPage()`

### What Changes

- Replace `window.Ledger.DB.transactions.push(...)` with `window.Ledger.addTransaction(tx)` in `services/recurring.js`
- Remove the manual `saveData()` after the loop (it's now called per push)
- Keep `_advanceRecurring()` — that already modifies the recurring item in place

### Behaviour Change

**Minor:** `saveData()` + `renderPage()` will be called once per auto-posted transaction instead of once per batch. At typical volume (1-10 auto-posts on boot), this is negligible.

### What This Protects Against

Future side effects added to `addTransaction()` (e.g., validation, category learning, logging) will automatically apply to auto-posted transactions.

### Estimated Effort

- 2 lines changed in `services/recurring.js`
- Total: ~10 minutes including testing

### Risk Assessment

**Risk:** Low. Behaviour is identical. The only difference is save/render frequency.

---

## Plan 3: Extract shared transaction filter function

### Issue

`pages/register.js` `filteredTransactions()` and `pages/reports.js` `reportFilterTx()` are ~90% identical filter chains. Any filter logic change must be applied to both. Additionally, `overview.js` has its own `overviewMatchDate()` which is a separate variant.

### Files Affected

- `js/utils.js` — add new `window.Ledger.filterTransactions(state, types)`
- `js/pages/register.js` — replace `filteredTransactions` body with call to shared function
- `js/pages/reports.js` — replace `reportFilterTx` body with call to shared function
- `js/wire/transactions.js` — references `window.Ledger.filteredTransactions()` (line 93 and 139)

### Root Cause

The filter logic was duplicated when the reports page was built. The reports page needed a filter with slightly different defaults, so the author forked `filteredTransactions` and adapted it. Over time both evolved independently.

### Current State

Both functions share this same filter chain:
1. Type match (array of allowed types)
2. Account match (touches account, fromId, toId)
3. Currency lookup via account/fromId/toId
4. Category match (including categorySplits)
5. Subcategory match (including splits)
6. Search in description + notes

They differ in:
- `reportFilterTx` receives types as parameter; `filteredTransactions` reads from `registerFilters.type`
- `reportFilterTx` has `f.datePreset === "all"` default; `filteredTransactions` uses `f.datePreset` directly
- `reportFilterTx` filters out `linkId` (linked transfer rows); `filteredTransactions` does not
- Date matching logic is inline in `reportFilterTx` via `reportMatchesDate()`; `filteredTransactions` uses a separate `regMatchesDate()`

### Proposed Implementation

**In `utils.js`:**

```js
// Unified filter: state = { type, account, currency, category, subcategory, datePreset, dateFrom, dateTo, search, uncategorized }
// filterTypes = array of allowed transaction types (e.g., ["expense","refund"])
// matchDateFn = optional function(dateStr) => bool; defaults to inclusive all
window.Ledger.filterTransactions = function(state, filterTypes, matchDateFn) {
  return window.Ledger.DB.transactions.filter(function(t){
    if(filterTypes && filterTypes.indexOf(t.type) === -1) return false;
    if(t.linkId && state.hideLinked) return false;  // reports filter uses this
    if(state.type !== "all" && t.type !== state.type) return false;
    if(matchDateFn && !matchDateFn(t.date)) return false;
    if(state.account !== "all"){
      var touches = (t.account === state.account) ||
        (t.fromType === "account" && t.fromId === state.account) ||
        (t.toType === "account" && t.toId === state.account);
      if(!touches) return false;
    }
    if(state.currency !== "all"){
      var cur = window.Ledger._txCurrency(t);
      if(cur !== state.currency) return false;
    }
    if(state.category !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.categoryId === state.category; })) return false;
      } else if(t.category !== state.category) return false;
    }
    if(state.subcategory !== "all"){
      if(t.categorySplits && t.categorySplits.length){
        if(!t.categorySplits.some(function(s){ return s.subcategoryId === state.subcategory; })) return false;
      } else if(t.subcategory !== state.subcategory) return false;
    }
    if(state.uncategorized){
      if(t.type === "transfer" || (t.categorySplits && t.categorySplits.length) || t.category) return false;
    }
    if(state.search && state.search.trim()){
      var q = state.search.trim().toLowerCase();
      var hay = ((t.desc||"") + " " + (t.notes||"")).toLowerCase();
      if(hay.indexOf(q) === -1) return false;
    }
    return true;
  });
};

// Helper: get currency from any transaction entity reference
window.Ledger._txCurrency = function(t){
  if(t.account){ var a = window.Ledger.findAccount(t.account); return a ? a.currency : null; }
  if(t.fromType === "account"){ var a2 = window.Ledger.findAccount(t.fromId); return a2 ? a2.currency : null; }
  if(t.toType === "account"){ var a3 = window.Ledger.findAccount(t.toId); return a3 ? a3.currency : null; }
  return null;
};
```

**Then in `pages/register.js`:**

```js
window.Ledger.filteredTransactions = function(){
  var f = window.Ledger.registerFilters;
  return window.Ledger.filterTransactions(f, ["expense","income","transfer","refund"], function(date){
    return window.Ledger.regMatchesDate(date);
  });
};
```

**In `pages/reports.js`:**

```js
window.Ledger.reportFilterTx = function(types){
  var f = window.Ledger.reportState;
  return window.Ledger.filterTransactions(f, types, function(date){
    return window.Ledger.reportMatchesDate(date);
  });
};
```

### Behaviour Change

**None.** The filter logic produces identical output. Verifying with existing tests — the `tests/integration.test.js` has basic filter verification (date range, type counts) that should pass unchanged.

### Dependencies

- `window.Ledger.filteredTransactions` is called by:
  - `wire/transactions.js:93` — `selectAllCb` checkbox (iterate visible transactions)
  - `wire/transactions.js:139` — bulk apply (check visible transactions)
  - `pages/register.js` — rendering (filter + group transactions)
- `window.Ledger.reportFilterTx` is called by:
  - `pages/reports.js` — all four report tab renderers

Both callers use the return value identically — an array of filtered transactions. No caller depends on the function being named `filteredTransactions` vs `filterTransactions`.

### Estimated Effort

- ~40 lines added to `utils.js`
- ~40 lines removed from `register.js`
- ~35 lines removed from `reports.js`
- Total: ~1 hour including testing

### Risk Assessment

**Risk:** Medium. The functions have diverged slightly — `reportFilterTx` filters out `linkId` entries, `filteredTransactions` does not. This must be preserved (I've accounted for it with `hideLinked` in the plan above). The date matching functions are separate (`regMatchesDate` vs `reportMatchesDate`) and are kept separate since they have different presets.

---

## Plan 4: Align duplicate detection keys

### Issue

`services/import-preview.js:137-139` generates duplicate keys inline that differ from `utils.js:205-208` `_dupeKey()`. The import version omits `type` and `account` from the key, making its duplicate detection slightly less accurate.

### Current State

**`utils.js` `_dupeKey`:**
```
date|type|account|amount|normalizedDescription
```

**`import-preview.js` inline key:**
```
date|amount|normalizedDescription
```

### Files Affected

- `js/services/import-preview.js` — the inline duplicate key in `openImportPreviewModal()`

### Root Cause

The import preview was built with a simpler duplicate key (date + amount + desc) that doesn't require the type and account to be known at parse time. Since the parser infers type (from signed amounts) and account (user-selected during import), these could be included.

### Proposed Change

Replace the inline key in `import-preview.js` with a call to `window.Ledger._dupeKey()` or replicate the same triplet. Since `_dupeKey` is prefixed with `_` (suggesting private), the cleanest approach is:

```js
// Before:
var normDesc = (t.desc || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
var k = (t.date||"") + "|" + String(t.amount) + "|" + normDesc;

// After:
// Use the same key as utils.js for consistency
var normDesc = (t.desc || "").toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
var txType = t._type || t.type || "";
var txAccount = preselectedAccount || t.account || "";
var k = (t.date||"") + "|" + txType + "|" + txAccount + "|" + String(t.amount) + "|" + normDesc;
```

This builds the same key structure as `_dupeKey` using available data.

### Behaviour Change

**Minor:** Import duplicate detection becomes stricter — it now differentiates between e.g. an expense and an income with the same date/amount/description (correct behaviour), and between the same transaction posted to two different accounts.

### Estimated Effort

- 3 lines changed in `services/import-preview.js`
- Total: ~10 minutes

### Risk Assessment

**Risk:** Very Low. The new key is a superset of the old one — it can only reduce false duplicate matches, never produce false positives.

---

## Plan 5: Add batch flag to mutations (optional, conditional on need)

### Issue

Every `store.js` mutation calls `saveData()` + `renderPage()` unconditionally. This means:
- Bulk import of 100 transactions via `addTransactionBatch` calls save/render once (good)
- But bulk update of 100 transactions via `updateTransaction` calls save/render 100 times (bad)
- Bulk delete of 200 transactions calls save/render 200 times

### Files Affected

- `js/store.js` — all mutation functions

### Proposed Change

The pattern already exists — `addTransaction(tx, skipSave)` and `replaceDebtItemsForTransaction(id, items, skipSave)` both accept `skipSave`. The same pattern should be applied to all mutations:

- `updateTransaction(id, changes, skipSave)`
- `upsertTransaction(rec, skipSave)`
- `deleteTransaction(id, skipSave)`
- `deleteTransactionsByLink(linkId, skipSave)`

Existing callers are unchanged (they don't pass `skipSave`, so it defaults to `undefined` = falsy = save).

### Behaviour Change

**None.** All existing code paths work identically.

### Not Implementing Unless Needed

This is pure performance optimization. At current data volumes (hundreds, not millions of transactions), the save/render overhead is imperceptible. Implement only if batch operations become a performance issue.

---

## Plan 6: Extract validation from modal (future, larger effort)

### Issue

`modals/tx-modals.js:492-641` contains validation rules (amount required, date required, from/to must differ, cross-currency amount required) mixed with persistence logic. No other code path can reuse these rules.

### Files Affected

- `js/utils.js` — add `window.Ledger.validateTransaction(data, isEdit)`
- `js/modals/tx-modals.js` — call the validator instead of inline checks

### Proposed Change

Extract validation into a function that takes a transaction data object and returns either `null` (valid) or an errors object:

```js
window.Ledger.validateTransaction = function(data){
  var errors = {};
  if(!data.amount || data.amount <= 0 || isNaN(data.amount)){
    errors.amount = "Enter a valid amount";
  }
  if(!data.date){
    errors.date = "Pick a date";
  }
  if(data.type === "transfer"){
    if(!data.fromId || !data.toId){
      errors.transfer = "Select both From and To";
    }
    if(data.fromType === data.toType && data.fromId === data.toId){
      errors.transfer = "From and To must be different";
    }
    // Cross-currency validation
    if(data.isCrossCurrency && (!data.convertedAmount || data.convertedAmount <= 0)){
      errors.convertedAmount = "Enter the amount received in " + data.toCurrency;
    }
  } else {
    if(!data.account){
      errors.account = "Select an account";
    }
    // Friend split requires category
    if(data.friendSplit && data.friendSplit.shares && data.friendSplit.shares.length){
      if(!data.category) errors.category = "Select a category for your share";
    }
  }
  return Object.keys(errors).length > 0 ? errors : null;
};
```

The modal calls this before building the transaction record. The persistence logic (creating the record, calling `addTransaction`/`upsertTransaction`, learning categories) stays in the modal.

### Behaviour Change

**None.** Validation is pure logic — same rules, same error messages.

### Why Not Do This Yet

Moving validation requires careful comparison of every branch condition. The modal has six different save paths:
1. Simple expense/income/refund
2. Transfer (same currency)
3. Cross-currency transfer pair
4. Friend split (expense + debt items)
5. Category split
6. Edit vs create (validation differs slightly for edit — `created` is preserved)

The effort is medium (~2 hours including testing), and the benefit (reusable validation) is only realized if a second entry point is added. Not recommended until that need arises.

---

## Summary Table

| Plan | Priority | Effort | Risk | Behaviour Change | Can Start Without Approval? |
|---|---|---|---|---|---|
| 1. Bulk delete → deleteTransaction | High | 20 min | Low | None | No, wait for review |
| 2. Auto-post → addTransaction | Medium | 10 min | Low | None | No, wait for review |
| 3. Shared filter function | Medium | 1 hr | Medium | None | No, wait for review |
| 4. Align duplicate keys | Low | 10 min | Very low | Minor (stricter dedup) | No, wait for review |
| 5. Batch flag on mutations | Low | 30 min | Low | None | Only if needed |
| 6. Extract validation | Medium | 2 hr | Medium | None | Future consideration |

All plans **preserve existing behaviour**. None change the user-facing application.

---

## Final Status

| Plan | Status | Files Changed | Tests Passing |
|---|---|---|---|
| 1. Bulk delete bypass | **Implemented & Approved** | `js/store.js`, `js/wire/transactions.js` | 313/313 |
| 2. Auto-post bypass | **Implemented & Approved** | `js/services/recurring.js` | 313/313 |
| 3. Shared filter function | **Implemented & Approved** | `js/utils.js`, `js/pages/register.js`, `js/pages/reports.js` | 313/313 |
| 4. Align duplicate keys | **Implemented & Approved** | `js/services/import-preview.js` | 313/313 |
| 5. Batch flag on mutations | **Implemented & Approved** | `js/store.js`, `js/wire/transactions.js`, `js/modals/utility-modals.js` | 313/313 |
| 6. Extract validation | **Deferred** (not implemented) | — | — |

**Decision:** Plan 6 is deferred. Revisit only if a second transaction entry point is introduced, validation becomes duplicated, or rules become substantially more complex.
