import { describe, it, expect, beforeAll } from "vitest";
import { loadLedger } from "./helpers/load-ledger.js";

let L;
beforeAll(() => { L = loadLedger(); });

/* ============================================================
   constants.js
   ============================================================ */
describe("normalizeMerchant", () => {
  it("lowercases and strips special chars", () => {
    expect(L.normalizeMerchant("STARBUCKS #12345")).toBe("starbucks 12345");
  });
  it("strips common bank suffixes", () => {
    expect(L.normalizeMerchant("WALMART STORE PUR NA")).toContain("walmart store");
    expect(L.normalizeMerchant("WALMART STORE PUR NA")).not.toContain("na");
  });
  it("collapses whitespace", () => {
    expect(L.normalizeMerchant("hello   world")).toBe("hello world");
  });
  it("returns empty string for null/undefined", () => {
    expect(L.normalizeMerchant(null)).toBe("");
    expect(L.normalizeMerchant(undefined)).toBe("");
  });
});

describe("learnedCategoryKey", () => {
  it("returns first word of length >= 3", () => {
    expect(L.learnedCategoryKey("STARBUCKS COFFEE")).toBe("starbucks");
  });
  it("skips short words", () => {
    expect(L.learnedCategoryKey("AT TARGET STORE")).toBe("target");
  });
});

describe("suggestCategoryForDescription", () => {
  it("matches built-in keyword: Food for starbucks", () => {
    const DB = { categoryLearning: {}, subcategoryLearning: {}, categories: L.DB.categories };
    const result = L.suggestCategoryForDescription("STARBUCKS DOWNTOWN", "expense", DB, L.findCategory);
    expect(result).toBeTruthy();
    expect(result.categoryId).toBeTruthy();
    const cat = L.findCategory(result.categoryId);
    expect(cat.name).toBe("Food");
  });
  it("matches learned category mapping", () => {
    const testCat = { id: "cat123", name: "Custom", type: "expense", subs: [] };
    L.DB.categories.push(testCat);
    const DB = {
      categoryLearning: { "myvendor": "cat123" },
      subcategoryLearning: {},
      categories: L.DB.categories,
    };
    const result = L.suggestCategoryForDescription("MYVENDOR INC payment", "expense", DB, L.findCategory);
    expect(result).toBeTruthy();
    expect(result.categoryId).toBe("cat123");
    L.DB.categories = L.DB.categories.filter(c => c.id !== "cat123");
  });
  it("matches learned subcategory mapping", () => {
    const testCat = { id: "cat1", name: "Food", type: "expense", subs: [{ id: "sub1", name: "Restaurants" }] };
    L.DB.categories.push(testCat);
    const DB = {
      categoryLearning: {},
      subcategoryLearning: { "myvendor": { catId: "cat1", subId: "sub1" } },
      categories: L.DB.categories,
    };
    const result = L.suggestCategoryForDescription("MYVENDOR DINNER", "expense", DB, L.findCategory);
    expect(result).toBeTruthy();
    expect(result.subcategoryId).toBe("sub1");
    L.DB.categories = L.DB.categories.filter(c => c.id !== "cat1");
  });
  it("returns null for unknown description", () => {
    const DB = { categoryLearning: {}, subcategoryLearning: {}, categories: L.DB.categories };
    const result = L.suggestCategoryForDescription("ZZZZXYZRANDOM 99999", "expense", DB, L.findCategory);
    expect(result).toBeNull();
  });
});

describe("rankCategorySuggestions", () => {
  it("returns array sorted by score descending", () => {
    const DB = { categoryLearning: {}, subcategoryLearning: {}, categories: L.DB.categories, transactions: [] };
    const results = L.rankCategorySuggestions("STARBUCKS COFFEE", "expense", DB, L.findCategory);
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 1) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });
  it("returns max 3 results", () => {
    const DB = { categoryLearning: {}, subcategoryLearning: {}, categories: L.DB.categories, transactions: [] };
    const results = L.rankCategorySuggestions("WALMART STORE PURCHASE", "expense", DB, L.findCategory);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
