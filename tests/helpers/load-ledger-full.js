import { loadLedger } from "./load-ledger.js";

const PAGE_FILES = [
  "js/components/transaction-row.js",
  "js/pages/overview.js",
  "js/pages/register.js",
  "js/pages/reports.js",
  "js/pages/accounts.js",
  "js/pages/people.js",
  "js/pages/recurring.js",
  "js/pages/categories.js",
  "js/pages/settings.js",
];

export function loadLedgerFull(overrides) {
  return loadLedger(overrides, PAGE_FILES);
}
