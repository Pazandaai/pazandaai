import { describe, expect, it } from "vitest";
import { getDifficultyKey, mergeBrokenEntries, parseSingleIngredient } from "../recipe-utils";

describe("recipe-utils", () => {
  it("LEAD miqdor + qavs tozalanadi", () => {
    const r = parseSingleIngredient("4 dona laym sharbati (120 ml)");
    expect(r.quantity).toBe(4);
    expect(r.unit).toBe("dona");
    expect(r.name).toBe("laym sharbati");
  });

  it("qavs ichidagi miqdor", () => {
    const r = parseSingleIngredient("Qo'y go'shti (800g)");
    expect(r.quantity).toBe(800);
    expect(r.unit).toBe("g");
  });

  it("murakkab -> hard", () => {
    expect(getDifficultyKey("murakkab")).toBe("hard");
  });

  it("singan qator birlashadi", () => {
    const m = mergeBrokenEntries([{ name: "1.8 kg kartoshka (tozalanib" }, { name: "bo'lingan)" }]);
    expect(m.length).toBe(1);
  });
});
