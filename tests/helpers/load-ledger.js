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
  "js/services/backup-format.js",
  "js/services/backup.js",
  "js/services/demo-status.js",
  "js/services/import-preview.js",
  "js/app.js",
];

function fakeElement() {
  const el = {
    className: "",
    textContent: "",
    value: "",
    style: {},
    _html: "",
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    appendChild: () => {},
    removeChild: () => {},
    click: () => {},
    focus: () => {},
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    closest: () => fakeElement(),
    parentElement: null,
    tagName: "DIV",
    querySelector: () => fakeElement(),
    querySelectorAll: () => [],
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
  };
  return el;
}

export function loadLedger(overrides, extraFiles) {
  const files = extraFiles && extraFiles.length ? FILES_IN_ORDER.concat(extraFiles) : FILES_IN_ORDER;
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
    FileReader: class { readAsText() {} },
    indexedDB: { open: () => ({}) },
    localStorage: {
      _store: {},
      getItem(k) { return this._store[k] || null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
    },
    document: {
      getElementById: () => fakeElement(),
      querySelector: () => fakeElement(),
      querySelectorAll: () => [],
      createElement: () => fakeElement(),
      activeElement: null,
      body: {
        appendChild: () => {},
        removeChild: () => {},
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

  for (const rel of files) {
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
