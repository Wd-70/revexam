import type { Jamo, JamoSequence } from './Jamo';

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ',
  'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ',
  'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ',
  'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ',
  'ㅣ',
] as const;

const JONG = [
  '',   'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ',
  'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ',
  'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ',
  'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export function decomposeChar(ch: string): JamoSequence {
  if (ch.length === 0) return [];
  const code = ch.codePointAt(0);
  if (code === undefined) return [];
  if (code < SYLLABLE_BASE || code > SYLLABLE_END) return [ch];

  const offset = code - SYLLABLE_BASE;
  const cho = Math.floor(offset / (JUNG_COUNT * JONG_COUNT));
  const jung = Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT);
  const jong = offset % JONG_COUNT;

  const choJamo = CHO[cho]!;
  const jungJamo = JUNG[jung]!;
  if (jong === 0) return [choJamo, jungJamo];
  return [choJamo, jungJamo, JONG[jong]!];
}

export function decompose(s: string): JamoSequence {
  if (s.length === 0) return [];
  const normalized = s.normalize('NFC');
  const out: Jamo[] = [];
  for (const ch of normalized) {
    const parts = decomposeChar(ch);
    for (const j of parts) out.push(j);
  }
  return out;
}
