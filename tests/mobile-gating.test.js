import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   app.js — applyLayoutMode
   ============================================================ */
describe("applyLayoutMode", () => {
  beforeEach(() => {
    L._autoIsMobile = false;
    L.layoutMode = "auto";
    L.isMobile = false;
  });

  it("auto mode uses _autoIsMobile", () => {
    L._autoIsMobile = true;
    L.applyLayoutMode("auto", true);
    expect(L.isMobile).toBe(true);
    expect(L.layoutMode).toBe("auto");
  });

  it("mobile mode forces isMobile true", () => {
    L._autoIsMobile = false;
    L.applyLayoutMode("mobile", true);
    expect(L.isMobile).toBe(true);
    expect(L.layoutMode).toBe("mobile");
  });

  it("desktop mode forces isMobile false", () => {
    L._autoIsMobile = true;
    L.applyLayoutMode("desktop", true);
    expect(L.isMobile).toBe(false);
    expect(L.layoutMode).toBe("desktop");
  });

  it("saves to localStorage", () => {
    L.applyLayoutMode("mobile", true);
    expect(L._localStorage.getItem("ledger_layout_mode")).toBe("mobile");
  });

  it("sets body.is-mobile class", () => {
    L.applyLayoutMode("mobile", true);
    expect(L._document.body.classList.contains("is-mobile")).toBe(true);
    L.applyLayoutMode("desktop", true);
    expect(L._document.body.classList.contains("is-mobile")).toBe(false);
  });

  it("skipRender=true does not call renderPage", () => {
    let rendered = false;
    L.renderPage = () => { rendered = true; };
    L.applyLayoutMode("mobile", true);
    expect(rendered).toBe(false);
  });

  it("skipRender=false calls renderPage", () => {
    let rendered = false;
    L.renderPage = () => { rendered = true; };
    L.applyLayoutMode("mobile", false);
    expect(rendered).toBe(true);
  });
});
