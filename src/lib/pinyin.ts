import { pinyin } from "pinyin-pro";

export interface PinyinChar {
  char: string;
  reading: string;
}

export function isChineseLang(lang?: string): boolean {
  if (!lang) {
    return false;
  }
  return lang.toLowerCase().startsWith("zh");
}

export function containsHanScript(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

export function toPinyinChars(text: string): PinyinChar[] {
  const chars = Array.from(text);
  const readings = pinyin(text, { type: "array", toneType: "symbol" });

  if (readings.length !== chars.length) {
    return chars.map((char) => ({ char, reading: char }));
  }

  return chars.map((char, i) => ({ char, reading: readings[i] }));
}
