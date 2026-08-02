import { describe, it, expect } from "vitest";
import { loadLedgerFull } from "./helpers/load-ledger-full.js";

function makeEl(tag, classes) {
  const el = {
    tagName: (tag || "DIV").toUpperCase(),
    className: classes || "",
    textContent: "",
    value: "",
    style: {},
    _attrs: {},
    children: [],
    _classes: {},
    disabled: false,
    parentNode: null,
    id: "",
    get innerHTML() {
      return this.children.map((c) => c.textContent).join("");
    },
    set innerHTML(v) {
      this.textContent = String(v);
    },
    classList: {
      add(c) { el._classes[c] = true; },
      remove(c) { delete el._classes[c]; },
      toggle(c, f) { if (f === undefined) { el._classes[c] = !el._classes[c]; } else { el._classes[c] = !!f; } },
      contains(c) { return !!el._classes[c]; },
    },
    setAttribute(k, v) { el._attrs[k] = v; },
    getAttribute(k) { return k in el._attrs ? el._attrs[k] : null; },
    appendChild(child) { el.children.push(child); child.parentNode = el; return child; },
    insertBefore(child) { el.children.push(child); child.parentNode = el; return child; },
    querySelectorAll(sel) {
      if (sel === "option") return el.children.filter((c) => c.tagName === "OPTION");
      if (sel === "label") return el.children.filter((c) => c.tagName === "LABEL");
      return el.children.filter((c) => c.className.split(" ").some((x) => sel.replace(".", "").split(" ").indexOf(x) !== -1));
    },
    querySelector(sel) { return el.querySelectorAll(sel)[0] || null; },
    closest() { return el.parentNode; },
    addEventListener() {},
    dispatchEvent() {},
    focus() {},
    click() {},
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 40, width: 200 }; },
    scrollIntoView() {},
  };
  return el;
}

function makeSelect(selectedVal, options) {
  const sel = makeEl("select");
  sel.value = selectedVal;
  sel.parentNode = makeEl("form");
  options.forEach((o) => {
    const opt = makeEl("option");
    opt.value = o.value;
    opt.textContent = o.text;
    opt.disabled = !!o.disabled;
    sel.children.push(opt);
  });
  return sel;
}

describe("custom-dropdown initCustomDropdowns", () => {
  it("builds one item per option and does not throw", () => {
    const selects = [
      makeSelect("b", [{ value: "a", text: "Alpha" }, { value: "b", text: "Beta" }]),
      makeSelect("x", [{ value: "x", text: "Only" }]),
    ];
    const doc = {
      querySelectorAll(sel) {
        if (sel.indexOf("select") === 0) return selects;
        return [];
      },
      querySelector() { return null; },
      getElementById() { return null; },
      createElement(tag) { return makeEl(tag); },
      addEventListener() {},
      body: { appendChild() {} },
    };
    const L = loadLedgerFull({ document: doc });

    expect(() => L.initCustomDropdowns()).not.toThrow();

    selects.forEach((sel) => {
      const wrap = sel.parentNode.children.find((c) => c.className.indexOf("cd-wrap") !== -1);
      const list = wrap.children.find((c) => c.className.indexOf("cd-list") !== -1);
      expect(list).toBeDefined();
      const items = list.querySelectorAll(".cd-item");
      expect(items.length).toBe(sel.querySelectorAll("option").length);
      const selected = items.filter((i) => i._attrs["aria-selected"] === "true");
      expect(selected.length).toBe(1);
    });

    const sel0 = selects[0];
    const wrap0 = sel0.parentNode.children.find((c) => c.className.indexOf("cd-wrap") !== -1);
    const list0 = wrap0.children.find((c) => c.className.indexOf("cd-list") !== -1);
    const trigger0 = wrap0.children.find((c) => c.className.indexOf("cd-trigger") !== -1);
    expect(trigger0.textContent).toBe("Beta");
    expect(list0.querySelectorAll(".cd-item")[0]._attrs["role"]).toBe("option");
  });

  it("skips selects marked cd-initialized or data-no-cd", () => {
    const a = makeSelect("a", [{ value: "a", text: "A" }]);
    a.classList.add("cd-initialized");
    const b = makeSelect("b", [{ value: "b", text: "B" }]);
    b.setAttribute("data-no-cd", "1");
    const c = makeSelect("c", [{ value: "c", text: "C" }]);
    const doc = {
      querySelectorAll(sel) {
        if (sel.indexOf("select") === 0) {
          return [a, b, c].filter(function (s) {
            return !s.classList.contains("cd-initialized") && !s.getAttribute("data-no-cd");
          });
        }
        return [];
      },
      querySelector() { return null; },
      getElementById() { return null; },
      createElement(tag) { return makeEl(tag); },
      addEventListener() {},
      body: { appendChild() {} },
    };
    const L = loadLedgerFull({ document: doc });
    expect(() => L.initCustomDropdowns()).not.toThrow();
    const wrapped = c.parentNode.children.filter((x) => x.className.indexOf("cd-wrap") !== -1);
    expect(wrapped.length).toBe(1);
    expect(a.parentNode.children.filter((x) => x.className.indexOf("cd-wrap") !== -1).length).toBe(0);
    expect(b.parentNode.children.filter((x) => x.className.indexOf("cd-wrap") !== -1).length).toBe(0);
  });
});
