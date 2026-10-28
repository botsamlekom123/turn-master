import { describe, expect, it } from "vitest";
import wordData from "./indonesianWords.txt?raw";
import { getLastLetter, normalizeWord, parseWordDictionary, validateWordChainEntry } from "./wordList";

const wordSet = parseWordDictionary(wordData);

describe("word-chain word validation", () => {
  it("normalizes whitespace and case", () => {
    expect(normalizeWord("  Apel ")).toBe("apel");
    expect(getLastLetter("apel")).toBe("l");
  });

  it("accepts a KBBI word starting with the previous word's last letter", () => {
    expect(validateWordChainEntry("laut", "apel", ["apel"], wordSet)).toBeNull();
  });

  it("accepts words from the imported KBBI dictionary", () => {
    expect(validateWordChainEntry("komputer", "jeruk", [], wordSet)).toBeNull();
    expect(validateWordChainEntry("internet", "gigi", [], wordSet)).toBeNull();
    expect(validateWordChainEntry("sepeda", "nanas", [], wordSet)).toBeNull();
    expect(validateWordChainEntry("salju", "beras", [], wordSet)).toBeNull();
    expect(validateWordChainEntry("zuzuni", "xyz", [], wordSet)).toBeNull();
  });

  it("rejects words missing from the KBBI dictionary", () => {
    expect(validateWordChainEntry("lzxq", "apel", ["apel"], wordSet)).toContain("daftar kata");
  });

  it("rejects entries with the wrong starting letter", () => {
    expect(validateWordChainEntry("rumah", "apel", ["apel"], wordSet)).toContain("dimulai");
  });

  it("rejects repeated words and invalid characters", () => {
    expect(validateWordChainEntry("apel", "buah", ["apel"], wordSet)).toContain("sudah pernah");
    expect(validateWordChainEntry("apel!", "apel", [], wordSet)).toContain("tanpa angka");
  });
});
