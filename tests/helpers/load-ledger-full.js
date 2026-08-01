import { loadLedger } from "./load-ledger.js";

const PAGE_FILES = [
  "js/components/transaction-row.js",
  "js/components/custom-dropdown.js",
  "js/components/date-picker.js",
  "js/components/date-range-picker.js",
  "js/modals.js",
  "js/modals/tx-modals.js",
  "js/modals/account-modals.js",
  "js/modals/person-modal.js",
  "js/modals/split-modals.js",
  "js/modals/utility-modals.js",
  "js/modals/group-modals.js",
  "js/pages/overview.js",
  "js/pages/register.js",
  "js/pages/reports.js",
  "js/pages/accounts.js",
  "js/pages/people.js",
  "js/pages/recurring.js",
  "js/pages/categories.js",
  "js/pages/settings.js",
  "js/wire/overview.js",
  "js/wire/transactions.js",
  "js/wire/accounts.js",
  "js/wire/categories.js",
  "js/wire/payees.js",
  "js/wire/reports.js",
  "js/wire/scheduled.js",
  "js/wire/settings.js",
];

export function loadLedgerFull(overrides) {
  return loadLedger(overrides, PAGE_FILES);
}
