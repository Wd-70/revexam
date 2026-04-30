import { describe, expect, it } from 'vitest';
import { grade } from './GradingService';

describe('grade — target perspective (targetChars)', () => {
  it('returns all pending and 0% for empty typed input', () => {
    const r = grade('한글', '');
    expect(r.accuracy).toBe(0);
    expect(r.targetChars).toHaveLength(2);
    expect(r.targetChars.every((c) => c.status === 'pending')).toBe(true);
  });

  it('marks every character correct when input matches exactly', () => {
    const r = grade('가나다', '가나다');
    expect(r.accuracy).toBe(100);
    expect(r.targetChars.map((c) => c.status)).toEqual(['correct', 'correct', 'correct']);
  });

  it('returns partial when 종성 is missing (하 vs 한)', () => {
    // target '한' = ㅎㅏㄴ, typed '하' = ㅎㅏ → positional: ㅎ✓ ㅏ✓ ㄴ✗ → 2/3
    const r = grade('한', '하');
    expect(r.targetChars[0]!.status).toBe('partial');
    expect(r.targetChars[0]!.matchedJamo).toBe(2);
    expect(r.targetChars[0]!.totalJamo).toBe(3);
    expect(r.accuracy).toBe(67);
  });

  it('marks unreached trailing characters as pending', () => {
    const r = grade('한글', '한');
    expect(r.targetChars[0]!.status).toBe('correct');
    expect(r.targetChars[1]!.status).toBe('pending');
    expect(r.accuracy).toBe(50);
  });

  it('marks skipped characters between anchors as wrong', () => {
    // target '가나다', typed '가다' → LCS anchors 가,다 → 나 is between → wrong
    const r = grade('가나다', '가다');
    expect(r.targetChars.map((c) => c.status)).toEqual(['correct', 'wrong', 'correct']);
    expect(r.accuracy).toBe(67);
  });

  it('handles 초성 substitution as partial (한→안: ㅎ≠ㅇ, ㅏ✓, ㄴ✓)', () => {
    const r = grade('한', '안');
    expect(r.targetChars[0]!.status).toBe('partial');
    expect(r.targetChars[0]!.matchedJamo).toBe(2);
    expect(r.accuracy).toBe(67);
  });

  it('does not exceed 100% when typed has extra trailing input', () => {
    const r = grade('가', '가나다');
    expect(r.accuracy).toBe(100);
    expect(r.targetChars[0]!.status).toBe('correct');
  });

  it('preserves whitespace as a token', () => {
    const r = grade('가 나', '가 나');
    expect(r.targetChars).toHaveLength(3);
    expect(r.targetChars.map((c) => c.ch)).toEqual(['가', ' ', '나']);
    expect(r.accuracy).toBe(100);
  });

  it('counts missing space as wrong', () => {
    const r = grade('가 나', '가나');
    // LCS anchors: 가(0,0), 나(2,1) — space is between, skipped → wrong
    const space = r.targetChars[1]!;
    expect(space.ch).toBe(' ');
    expect(space.status).toBe('wrong');
    expect(r.accuracy).toBe(80);
  });

  it('returns empty for empty target', () => {
    const r = grade('', '');
    expect(r.targetChars).toEqual([]);
    expect(r.accuracy).toBe(0);
  });

  it('treats completely different input as wrong', () => {
    // 가(ㄱ,ㅏ) vs 무(ㅁ,ㅜ) — positional: ㄱ≠ㅁ, ㅏ≠ㅜ → 0 match
    const r = grade('가', '무');
    expect(r.targetChars[0]!.status).toBe('wrong');
    expect(r.accuracy).toBe(0);
  });
});

describe('grade — typed perspective (typedChars)', () => {
  it('returns empty typedChars for empty typed input', () => {
    expect(grade('가', '').typedChars).toEqual([]);
  });

  it('marks every typed character correct on exact match', () => {
    const r = grade('가나다', '가나다');
    expect(r.typedChars.map((c) => c.status)).toEqual(['correct', 'correct', 'correct']);
  });

  it('marks typed char correct when all its jamo were correct (하 vs 한)', () => {
    // typed '하'(ㅎ,ㅏ): both matched positionally → 2/2 = correct for typed side
    const r = grade('한', '하');
    expect(r.typedChars[0]!.status).toBe('correct');
    expect(r.typedChars[0]!.matchedJamo).toBe(2);
  });

  it('marks substituted typed char as partial when some jamo match (안 vs 한)', () => {
    // typed '안'(ㅇ,ㅏ,ㄴ): ㅇ≠ㅎ, ㅏ✓, ㄴ✓ → 2/3 partial
    const r = grade('한', '안');
    expect(r.typedChars[0]!.status).toBe('partial');
    expect(r.typedChars[0]!.matchedJamo).toBe(2);
  });

  it('marks extra typed characters as wrong', () => {
    const r = grade('가', '가나다');
    expect(r.typedChars[0]!.status).toBe('correct');
    expect(r.typedChars[1]!.status).toBe('wrong');
    expect(r.typedChars[2]!.status).toBe('wrong');
  });

  it('marks completely different typed char as wrong', () => {
    const r = grade('가', '무');
    expect(r.typedChars[0]!.status).toBe('wrong');
  });

  it('marks typed chars correct when user skips a target char (가다 vs 가나다)', () => {
    const r = grade('가나다', '가다');
    expect(r.typedChars.map((c) => c.status)).toEqual(['correct', 'correct']);
  });

  it('reports skippedBefore count when target chars are jumped over', () => {
    // target '가나다라마바사', typed '가라사'
    // LCS anchors: 가(0→0), 라(3→1), 사(6→2)
    // Between 가 and 라: 나,다 skipped (2)
    // Between 라 and 사: 마,바 skipped (2)
    const r = grade('가나다라마바사', '가라사');
    expect(r.typedChars.map((c) => c.skippedBefore)).toEqual([0, 2, 2]);
    expect(r.typedChars.map((c) => c.status)).toEqual(['correct', 'correct', 'correct']);
  });

  it('reports skippedBefore=0 when no chars are skipped', () => {
    const r = grade('가나다', '가나다');
    expect(r.typedChars.every((c) => c.skippedBefore === 0)).toBe(true);
  });

  it('reports skippedBefore on first typed char when beginning is skipped', () => {
    // target '가나다', typed '다' → LCS anchors: 다(2→0) → 가,나 skipped before 다
    const r = grade('가나다', '다');
    expect(r.typedChars).toHaveLength(1);
    expect(r.typedChars[0]!.skippedBefore).toBe(2);
    expect(r.typedChars[0]!.status).toBe('correct');
  });
});

describe('grade — random / unrelated input should score low', () => {
  it('scores near 0% for completely unrelated text', () => {
    const r = grade(
      '예수 그리스도의 계시라',
      '아무거나 막 입력해봄'
    );
    expect(r.accuracy).toBeLessThan(25);
    // Most typed chars should be wrong
    const wrongCount = r.typedChars.filter((c) => c.status === 'wrong').length;
    expect(wrongCount).toBeGreaterThan(r.typedChars.length * 0.5);
  });

  it('scores 100% for exact match of a real verse', () => {
    const verse = '예수 그리스도의 계시라 이는 하나님이 그에게 주사';
    const r = grade(verse, verse);
    expect(r.accuracy).toBe(100);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('gives partial credit for small typo, not full credit', () => {
    const r = grade('하나님이', '하나님의');
    // '이' vs '의': ㅇ=ㅇ ㅣ≠ㅢ → 1/2 partial (or 0 if compound vowel)
    expect(r.accuracy).toBeGreaterThan(60);
    expect(r.accuracy).toBeLessThan(100);
  });
});
