import wordDataUrl from "./indonesianWords.txt?url";

export function parseWordDictionary(contents: string): ReadonlySet<string> {
  return new Set(contents.split(/\r?\n/).filter((word) => /^[a-z]{2,20}$/.test(word)));
}

export async function loadWordDictionary(): Promise<ReadonlySet<string>> {
  const response = await fetch(wordDataUrl);
  if (!response.ok) {
    throw new Error(`Gagal memuat daftar kata (HTTP ${response.status}).`);
  }
  return parseWordDictionary(await response.text());
}

export function normalizeWord(word: string): string {
  return word.trim().toLocaleLowerCase("id-ID");
}

export function getLastLetter(word: string): string {
  return normalizeWord(word).slice(-1);
}

export function validateWordChainEntry(
  candidate: string,
  previousWord: string,
  usedWords: readonly string[],
  wordSet: ReadonlySet<string>,
): string | null {
  const word = normalizeWord(candidate);
  if (!/^[a-z]{2,20}$/.test(word)) {
    return "Gunakan satu kata berisi 2–20 huruf tanpa angka atau tanda baca.";
  }
  if (!wordSet.has(word)) {
    return "Kata tidak ada di daftar kata yang didukung.";
  }
  if (usedWords.some((used) => normalizeWord(used) === word)) {
    return "Kata itu sudah pernah dipakai di ronde ini.";
  }
  if (word[0] !== getLastLetter(previousWord)) {
    return `Kata harus dimulai dengan huruf “${getLastLetter(previousWord)}”.`;
  }
  return null;
}
