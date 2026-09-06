import { describe, expect, it } from "vitest";
import { spoken } from "./spoken.js";

describe("spoken", () => {
  it("removes citations and reads symbols as words", () => {
    expect(spoken("Reliance crossed ₹1,300. Nifty moved −1.3%; the stock itself accounts for +3.0% [2].")).toBe(
      "Reliance crossed 1,300 rupees. Nifty moved minus 1.3 percent; the stock itself accounts for up 3.0 percent.",
    );
  });

  it("leaves hyphenated words alone but reads a leading minus", () => {
    expect(spoken("HDFC Bank made a new 52‑week low. Move: -0.6%")).toBe("HDFC Bank made a new 52-week low. Move: minus 0.6 percent");
  });
});
