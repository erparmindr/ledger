import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const FILES_IN_ORDER = [
  "js/constants.js",
  "js/utils.js",
  "js/store.js",
  "js/services/storage.js",
  "js/services/csv-import.js",
  "js/services/recurring.js",
  "js/services/demo-data.js",
  "js/services/backup.js",
  "js/services/import-preview.js",
  "js/app.js",
];

export function loadLedger(overrides) {
  const ctx = {
    window: {},
    console,
    Date,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Infinity,
    NaN,
    String,
    Number,
    Array,
    Object,
    JSON,
    RegExp,
    Error,
    TypeError,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    encodeURIComponent,
    decodeURIComponent,
    escape,
    unescape,
    indexedDB: { open: () => ({}) },
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
    },
    document: {
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        className: "",
        textContent: "",
        innerHTML: "",
        style: {},
        appendChild: () => {},
        click: () => {},
        addEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        closest: () => null,
        parentElement: null,
        tagName: "",
        value: "",
      }),
      body: {
        appendChild: () => {},
        setAttribute: () => {},
        classList: {
          _classes: {},
          toggle(cls, force) {
            if (force === undefined) this._classes[cls] = !this._classes[cls];
            else this._classes[cls] = !!force;
          },
          add(cls) { this._classes[cls] = true; },
          remove(cls) { this._classes[cls] = false; },
          contains(cls) { return !!this._classes[cls]; },
        },
        setAttribute: () => {},
      },
      addEventListener: () => {},
    },
    navigator: { serviceWorker: null },
    location: { protocol: "https:", hostname: "localhost" },
    lucide: { createIcons: () => {} },
  };

  ctx.window = ctx;
  ctx.self = ctx;

  if (overrides) Object.assign(ctx, overrides);

  const context = vm.createContext(ctx);

  for (const rel of FILES_IN_ORDER) {
    const full = path.join(ROOT, rel);
    const code = fs.readFileSync(full, "utf8");
    try {
      vm.runInContext(code, context, { filename: rel });
    } catch (e) {
      console.error(`Error loading ${rel}:`, e.message);
    }
  }

  const result = ctx.window.Ledger;
  result._localStorage = ctx.localStorage;
  result._document = ctx.document;
  return result;
}
