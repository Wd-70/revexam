import { describe, expect, it } from 'vitest';
import { decompose, decomposeChar } from './HangulDecomposer';

describe('decomposeChar', () => {
  it('returns empty array for empty input', () => {
    expect(decomposeChar('')).toEqual([]);
  });

  it('passes ASCII through unchanged as a single token', () => {
    expect(decomposeChar('A')).toEqual(['A']);
    expect(decomposeChar('!')).toEqual(['!']);
    expect(decomposeChar('1')).toEqual(['1']);
    expect(decomposeChar(' ')).toEqual([' ']);
  });

  it('splits a syllable without jongseong into 초성·중성', () => {
    expect(decomposeChar('가')).toEqual(['ㄱ', 'ㅏ']);
    expect(decomposeChar('나')).toEqual(['ㄴ', 'ㅏ']);
    expect(decomposeChar('이')).toEqual(['ㅇ', 'ㅣ']);
  });

  it('splits a syllable with jongseong into 초성·중성·종성', () => {
    expect(decomposeChar('한')).toEqual(['ㅎ', 'ㅏ', 'ㄴ']);
    expect(decomposeChar('글')).toEqual(['ㄱ', 'ㅡ', 'ㄹ']);
    expect(decomposeChar('말')).toEqual(['ㅁ', 'ㅏ', 'ㄹ']);
  });

  it('handles double consonants in 초성', () => {
    expect(decomposeChar('까')).toEqual(['ㄲ', 'ㅏ']);
    expect(decomposeChar('빠')).toEqual(['ㅃ', 'ㅏ']);
    expect(decomposeChar('짜')).toEqual(['ㅉ', 'ㅏ']);
  });

  it('keeps double 종성 as a single jamo (e.g. ㄲ)', () => {
    expect(decomposeChar('깎')).toEqual(['ㄲ', 'ㅏ', 'ㄲ']);
  });

  it('keeps compound 종성 as a single jamo (e.g. ㄺ, ㄻ, ㅄ)', () => {
    expect(decomposeChar('닭')).toEqual(['ㄷ', 'ㅏ', 'ㄺ']);
    expect(decomposeChar('삶')).toEqual(['ㅅ', 'ㅏ', 'ㄻ']);
    expect(decomposeChar('값')).toEqual(['ㄱ', 'ㅏ', 'ㅄ']);
  });

  it('handles complex 중성 (combined vowels)', () => {
    expect(decomposeChar('뷁')).toEqual(['ㅂ', 'ㅞ', 'ㄺ']);
    expect(decomposeChar('과')).toEqual(['ㄱ', 'ㅘ']);
    expect(decomposeChar('의')).toEqual(['ㅇ', 'ㅢ']);
  });

  it('passes standalone compatibility jamo through (U+3131 area)', () => {
    expect(decomposeChar('ㄱ')).toEqual(['ㄱ']);
    expect(decomposeChar('ㅏ')).toEqual(['ㅏ']);
  });

  it('passes emoji and high code points through as one token', () => {
    expect(decomposeChar('🙏')).toEqual(['🙏']);
  });
});

describe('decompose', () => {
  it('returns empty array for empty string', () => {
    expect(decompose('')).toEqual([]);
  });

  it('decomposes a multi-syllable Korean string', () => {
    expect(decompose('한글')).toEqual(['ㅎ', 'ㅏ', 'ㄴ', 'ㄱ', 'ㅡ', 'ㄹ']);
  });

  it('preserves whitespace and punctuation between syllables', () => {
    expect(decompose('가 나')).toEqual(['ㄱ', 'ㅏ', ' ', 'ㄴ', 'ㅏ']);
    expect(decompose('가, 나!')).toEqual(['ㄱ', 'ㅏ', ',', ' ', 'ㄴ', 'ㅏ', '!']);
  });

  it('mixes Korean and ASCII as a flat token sequence', () => {
    expect(decompose('a한')).toEqual(['a', 'ㅎ', 'ㅏ', 'ㄴ']);
    expect(decompose('Hello!')).toEqual(['H', 'e', 'l', 'l', 'o', '!']);
  });

  it('iterates by code points so emoji counts as one token', () => {
    expect(decompose('가🙏나')).toEqual(['ㄱ', 'ㅏ', '🙏', 'ㄴ', 'ㅏ']);
  });

  it('NFC-normalizes NFD-decomposed Hangul before splitting', () => {
    // 'ㄱ' (U+1100) + 'ㅏ' (U+1161) NFD → '가' NFC
    const nfd = '\u1100\u1161';
    expect(decompose(nfd)).toEqual(['ㄱ', 'ㅏ']);
  });

  it('decomposes the opening line of Revelation 1:1 to a stable jamo sequence', () => {
    const out = decompose('예수 그리스도');
    expect(out.slice(0, 5)).toEqual(['ㅇ', 'ㅖ', 'ㅅ', 'ㅜ', ' ']);
    expect(out.length).toBeGreaterThan(10);
  });
});
