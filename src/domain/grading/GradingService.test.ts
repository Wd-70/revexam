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
    // target '가나다', typed '가다' → greedy: 가 matches, 나 skipped, 다 matches → 나 wrong
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
    // greedy: 가 matches, space≠나 but look-ahead finds 나 at idx 2, space skipped → wrong
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
    // greedy: 가(0→0), 라(3→1) skip 나,다, 사(6→2) skip 마,바
    const r = grade('가나다라마바사', '가라사');
    expect(r.typedChars.map((c) => c.skippedBefore)).toEqual([0, 2, 2]);
    expect(r.typedChars.map((c) => c.status)).toEqual(['correct', 'correct', 'correct']);
  });

  it('reports skippedBefore=0 when no chars are skipped', () => {
    const r = grade('가나다', '가나다');
    expect(r.typedChars.every((c) => c.skippedBefore === 0)).toBe(true);
  });

  it('reports skippedBefore on first typed char when beginning is skipped', () => {
    // target '가나다', typed '다' → greedy: look-ahead finds 다(2→0) → 가,나 skipped before 다
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

describe('grade — greedy stability (no green→red flicker)', () => {
  it('prefix grading is stable when more chars are appended', () => {
    const target = '가나다라마';
    const r1 = grade(target, '가나');
    const r2 = grade(target, '가나다');
    const r3 = grade(target, '가나다라마');

    // The first 2 typedChars in r2 must match r1's typedChars
    expect(r2.typedChars.slice(0, 2).map((c) => c.status))
      .toEqual(r1.typedChars.map((c) => c.status));

    // The first 3 typedChars in r3 must match r2's typedChars
    expect(r3.typedChars.slice(0, 3).map((c) => c.status))
      .toEqual(r2.typedChars.map((c) => c.status));
  });

  it('prefix grading is stable even with a typo', () => {
    const target = '가나다라마';
    // Type '가하' (하 is wrong for 나), then extend to '가하다'
    const r1 = grade(target, '가하');
    const r2 = grade(target, '가하다');

    // '가' should be correct in both, '하' should be partial/wrong in both — never flip
    expect(r2.typedChars[0]!.status).toBe(r1.typedChars[0]!.status);
    expect(r2.typedChars[1]!.status).toBe(r1.typedChars[1]!.status);
  });

  it('previously correct chars stay correct after skip-ahead', () => {
    const target = '가나다라마바사';
    const r1 = grade(target, '가나');
    const r2 = grade(target, '가나마'); // skips 다,라

    // '가' and '나' must remain correct
    expect(r2.typedChars[0]!.status).toBe('correct');
    expect(r2.typedChars[1]!.status).toBe('correct');
    expect(r1.typedChars[0]!.status).toBe('correct');
    expect(r1.typedChars[1]!.status).toBe('correct');
  });
});

describe('grade — insertion handling (extra spaces / chars)', () => {
  it('extra space in typed does not break subsequent grading', () => {
    // target has no space, user inserts one
    const r = grade('가나다라', '가나 다라');
    // '가','나' correct, ' ' wrong (extra), '다','라' correct
    expect(r.typedChars[0]!.status).toBe('correct');
    expect(r.typedChars[1]!.status).toBe('correct');
    expect(r.typedChars[2]!.status).toBe('wrong');  // extra space
    expect(r.typedChars[3]!.status).toBe('correct');
    expect(r.typedChars[4]!.status).toBe('correct');
  });

  it('extra char mid-word does not shift all subsequent grading to wrong', () => {
    const r = grade('예수그리스도', '예수x그리스도');
    expect(r.typedChars[0]!.status).toBe('correct'); // 예
    expect(r.typedChars[1]!.status).toBe('correct'); // 수
    expect(r.typedChars[2]!.status).toBe('wrong');   // x (extra)
    expect(r.typedChars[3]!.status).toBe('correct'); // 그
    expect(r.typedChars[4]!.status).toBe('correct'); // 리
    expect(r.typedChars[5]!.status).toBe('correct'); // 스
    expect(r.typedChars[6]!.status).toBe('correct'); // 도
  });

  it('missing space (target has space, typed omits) still works via target skip', () => {
    const r = grade('가 나', '가나');
    expect(r.typedChars[0]!.status).toBe('correct');
    expect(r.typedChars[1]!.status).toBe('correct');
    expect(r.accuracy).toBe(80); // space was skipped
  });

  it('extra space in multi-word verse does not cascade errors', () => {
    const target = '예수 그리스도의 계시라';
    const typed  = '예수 그리 스도의 계시라';
    const r = grade(target, typed);
    // 예수 그리 all correct, extra space is wrong, 스도의 계시라 all correct
    const statuses = r.typedChars.map((c) => c.status);
    expect(statuses[0]).toBe('correct'); // 예
    expect(statuses[1]).toBe('correct'); // 수
    expect(statuses[2]).toBe('correct'); // space
    expect(statuses[3]).toBe('correct'); // 그
    expect(statuses[4]).toBe('correct'); // 리
    expect(statuses[5]).toBe('wrong');   // extra space
    expect(statuses[6]).toBe('correct'); // 스
    expect(statuses[7]).toBe('correct'); // 도
    expect(statuses[8]).toBe('correct'); // 의
    expect(statuses[9]).toBe('correct'); // space
    expect(statuses[10]).toBe('correct'); // 계
    expect(statuses[11]).toBe('correct'); // 시
    expect(statuses[12]).toBe('correct'); // 라
  });

  it('skipped phrase detected correctly via target look-ahead', () => {
    const target = '예수 그리스도의 계시라 이는 하나님이 그에게 주사';
    const typed  = '예수 그리스도의 계시라 하나님이 그에게 주사';
    const r = grade(target, typed);
    const statuses = r.typedChars.map((c) => c.status);
    // Everything typed is correct (user just skipped "이는 ")
    expect(statuses.every((s) => s === 'correct')).toBe(true);
    // "이는 " should be wrong in target perspective
    const targetStatuses = r.targetChars.map((c) => c.status);
    const targetChars = r.targetChars.map((c) => c.ch);
    const idxI = targetChars.indexOf('이');
    expect(targetStatuses[idxI]).toBe('wrong');  // 이
    expect(targetStatuses[idxI + 1]).toBe('wrong');  // 는
  });

  it('omitted space correctly skips target space, not misalign subsequent chars', () => {
    // User types "계시라이는" instead of "계시라 이는" (missing space)
    const target = '예수 그리스도의 계시라 이는 하나님이 그에게 주사';
    const typed  = '예수 그리스도의 계시라이는 하나님이 그에게 주사';
    const r = grade(target, typed);
    const statuses = r.typedChars.map((c) => c.status);
    const chars = r.typedChars.map((c) => c.ch);
    // All typed content chars should be correct — only the space was omitted
    const idxAfterRa = chars.indexOf('이');
    expect(statuses[idxAfterRa]).toBe('correct');   // 이
    expect(statuses[idxAfterRa + 1]).toBe('correct'); // 는
    // Chars after the omission should also be correct
    const idxHa = chars.indexOf('하');
    expect(statuses[idxHa]).toBe('correct');
  });
});
