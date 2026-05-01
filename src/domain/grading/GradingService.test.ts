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

  it('treats newline as space (verse boundary)', () => {
    const r = grade('가 나', '가\n나');
    expect(r.accuracy).toBe(100);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('treats newline as space in multi-verse grading', () => {
    const target = '첫째 절의 끝 둘째 절의 시작';
    const typed = '첫째 절의 끝\n둘째 절의 시작';
    const r = grade(target, typed);
    expect(r.accuracy).toBe(100);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
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

// ═══════════════════════════════════════════════════════════════════
// 계시록 1:1 전체 구절 대상 종합 오답 시나리오 테스트
// ═══════════════════════════════════════════════════════════════════
describe('grade — 계시록 1:1 종합 시나리오', () => {
  const REV_1_1 = '예수 그리스도의 계시라 이는 하나님이 그에게 주사 반드시 속히 될 일을 그 종들에게 보이시려고 그 천사를 그 종 요한에게 보내어 지시하신 것이라';

  // ── Helper ──
  /** Count how many typedChars have the given status */
  function countStatus(r: ReturnType<typeof grade>, s: string) {
    return r.typedChars.filter((c) => c.status === s).length;
  }

  // ─────────────────────────────────────────
  // A. 정확한 입력
  // ─────────────────────────────────────────
  it('A1: 완벽 입력 → 100%, 전부 correct', () => {
    const r = grade(REV_1_1, REV_1_1);
    expect(r.accuracy).toBe(100);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  // ─────────────────────────────────────────
  // B. 띄어쓰기 제거
  // ─────────────────────────────────────────
  it('B1: 단어 사이 공백 1개 제거 ("계시라 이는" → "계시라이는")', () => {
    const typed = REV_1_1.replace('계시라 이는', '계시라이는');
    const r = grade(REV_1_1, typed);
    // 공백만 빠졌으므로 모든 typed 문자는 correct여야 함
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
    // target에서 해당 공백만 wrong
    const targetSpace = r.targetChars.find(
      (c, i) => c.ch === ' ' && r.targetChars[i - 1]?.ch === '라' && r.targetChars[i + 1]?.ch === '이'
    );
    expect(targetSpace?.status).toBe('wrong');
  });

  it('B2: 여러 곳의 공백 제거 ("그에게 주사" → "그에게주사", "속히 될" → "속히될")', () => {
    const typed = REV_1_1.replace('그에게 주사', '그에게주사').replace('속히 될', '속히될');
    const r = grade(REV_1_1, typed);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('B3: 모든 공백 제거', () => {
    const typed = REV_1_1.replaceAll(' ', '');
    const r = grade(REV_1_1, typed);
    // 모든 typed 내용 문자는 correct
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
    // 정확도는 100보다 낮음 (공백 누락)
    expect(r.accuracy).toBeLessThan(100);
  });

  // ─────────────────────────────────────────
  // C. 띄어쓰기 추가 (삽입)
  // ─────────────────────────────────────────
  it('C1: 단어 중간에 공백 삽입 ("그리스도의" → "그리 스도의")', () => {
    const typed = REV_1_1.replace('그리스도의', '그리 스도의');
    const r = grade(REV_1_1, typed);
    const wrongChars = r.typedChars.filter((c) => c.status === 'wrong');
    // 삽입된 공백 1개만 wrong
    expect(wrongChars).toHaveLength(1);
    expect(wrongChars[0]!.ch).toBe(' ');
    // 나머지 전부 correct
    expect(countStatus(r, 'correct')).toBe(r.typedChars.length - 1);
  });

  it('C2: 여러 곳에 공백 삽입 ("반드시" → "반 드시", "보이시려고" → "보이 시려고")', () => {
    const typed = REV_1_1.replace('반드시', '반 드시').replace('보이시려고', '보이 시려고');
    const r = grade(REV_1_1, typed);
    const wrongChars = r.typedChars.filter((c) => c.status === 'wrong');
    expect(wrongChars).toHaveLength(2);
    expect(wrongChars.every((c) => c.ch === ' ')).toBe(true);
  });

  // ─────────────────────────────────────────
  // D. 단어 제거 (누락)
  // ─────────────────────────────────────────
  it('D1: 짧은 단어 제거 ("이는 " 빠짐)', () => {
    const typed = REV_1_1.replace('이는 ', '');
    const r = grade(REV_1_1, typed);
    // 입력한 문자는 모두 correct
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
    // target에서 이,는 이 wrong
    const tChars = r.targetChars.map((c) => c.ch).join('');
    const idx = tChars.indexOf('이는 하');
    expect(r.targetChars[idx]!.status).toBe('wrong');   // 이
    expect(r.targetChars[idx + 1]!.status).toBe('wrong'); // 는
  });

  it('D2: 중간 구절 제거 ("반드시 속히 될 일을 " 빠짐)', () => {
    const typed = REV_1_1.replace('반드시 속히 될 일을 ', '');
    const r = grade(REV_1_1, typed);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('D3: 끝부분 제거 (절반만 입력)', () => {
    const half = REV_1_1.slice(0, Math.floor(REV_1_1.length / 2));
    const r = grade(REV_1_1, half);
    // 입력한 부분은 모두 correct
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
    // 나머지 target은 pending
    const pendingCount = r.targetChars.filter((c) => c.status === 'pending').length;
    expect(pendingCount).toBeGreaterThan(0);
    expect(r.accuracy).toBeLessThan(60);
  });

  // ─────────────────────────────────────────
  // E. 단어 추가 (삽입)
  // ─────────────────────────────────────────
  it('E1: 단어 1개 삽입 ("계시라 정말 이는") — greedy 한계 케이스', () => {
    const typed = REV_1_1.replace('계시라 이는', '계시라 정말 이는');
    const r = grade(REV_1_1, typed);
    // "정말" 2글자가 "이는" 2글자와 1:1 jamo fallback으로 소비되어
    // 이후 연쇄 밀림이 발생함 — greedy L-to-R의 구조적 한계.
    // 삽입 이전 구간은 정확함
    const chars = r.typedChars.map((c) => c.ch);
    const idxRa = chars.indexOf('라');
    expect(r.typedChars[idxRa]!.status).toBe('correct');
    // wrong이 다수 발생
    const wrongCount = countStatus(r, 'wrong');
    expect(wrongCount).toBeGreaterThanOrEqual(2);
    // accuracy > 0 (완전 실패는 아님)
    expect(r.accuracy).toBeGreaterThan(0);
  });

  it('E2: 끝에 추가 입력 ("것이라 아멘")', () => {
    const typed = REV_1_1 + ' 아멘';
    const r = grade(REV_1_1, typed);
    // 원본 부분 전부 correct
    const originalLen = [...REV_1_1].length;
    const originalStatuses = r.typedChars.slice(0, originalLen).map((c) => c.status);
    expect(originalStatuses.every((s) => s === 'correct')).toBe(true);
    // 추가된 " 아멘" 부분은 wrong
    const extraStatuses = r.typedChars.slice(originalLen).map((c) => c.status);
    expect(extraStatuses.every((s) => s === 'wrong')).toBe(true);
  });

  // ─────────────────────────────────────────
  // F. 오타 (글자 치환)
  // ─────────────────────────────────────────
  it('F1: 초성 오타 ("하나님" → "카나님") — 나,님 correct, 카 partial', () => {
    const typed = REV_1_1.replace('하나님', '카나님');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    const idxKa = chars.indexOf('카');
    expect(r.typedChars[idxKa]!.status).toBe('partial'); // ㅋ≠ㅎ, ㅏ✓
    expect(r.typedChars[idxKa + 1]!.status).toBe('correct'); // 나
    expect(r.typedChars[idxKa + 2]!.status).toBe('correct'); // 님
  });

  it('F2: 종성 오타 ("보내어" → "보내엉") — 어→엉: partial', () => {
    const typed = REV_1_1.replace('보내어', '보내엉');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    const idx = chars.indexOf('엉');
    expect(r.typedChars[idx]!.status).toBe('partial');
    expect(r.typedChars[idx]!.matchedJamo).toBe(2); // ㅇ✓ ㅓ✓ ㅇ✗
  });

  it('F3: 완전히 다른 글자 ("주사" → "추자") — 각각 partial', () => {
    const typed = REV_1_1.replace('주사', '추자');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    const idx = chars.indexOf('추');
    // 추(ㅊ,ㅜ) vs 주(ㅈ,ㅜ) → ㅜ만 일치 → partial
    expect(r.typedChars[idx]!.status).toBe('partial');
  });

  // ─────────────────────────────────────────
  // G. 복합 오류
  // ─────────────────────────────────────────
  it('G1: 공백 제거 + 오타 ("그에게 주사" → "그에게쥬사")', () => {
    const typed = REV_1_1.replace('그에게 주사', '그에게쥬사');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    // 그,에,게 correct
    const idxGe = chars.indexOf('게');
    expect(r.typedChars[idxGe]!.status).toBe('correct');
    // 공백 제거 시 '쥬'는 target 공백과 페어링 → wrong (jamo 불일치)
    // greedy 한계: 공백 가드가 target look-ahead로 보내지만 exact '쥬'가 없음
    const idxJu = chars.indexOf('쥬');
    expect(r.typedChars[idxJu]!.status).toBe('wrong');
    // '사'는 target look-ahead로 복구됨
    expect(r.typedChars[idxJu + 1]!.status).toBe('correct');
  });

  it('G2: 공백 삽입 + 단어 누락 ("반드시 속히" → "반 드시")', () => {
    const typed = REV_1_1.replace('반드시 속히', '반 드시');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    // "속히" 누락, "반 드시"에서 공백은 extra
    // "될 일을..." 이후는 correct
    const idxDwel = chars.indexOf('될');
    expect(r.typedChars[idxDwel]!.status).toBe('correct');
  });

  it('G3: 단어 치환 ("천사를" → "선지자를")', () => {
    const typed = REV_1_1.replace('천사를', '선지자를');
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    // "를" 은 양쪽 다 있으므로 매치됨
    // "선지자"는 wrong/partial
    // "그 종 요한에게" 이후는 correct
    const idxYo = chars.indexOf('요');
    expect(r.typedChars[idxYo]!.status).toBe('correct');
    const idxHan = chars.indexOf('한');
    expect(r.typedChars[idxHan]!.status).toBe('correct');
  });

  it('G4: 어순 변경 — greedy L-to-R은 reordering 복구 불가', () => {
    const typed = REV_1_1.replace(
      '그 천사를 그 종 요한에게 보내어',
      '보내어 그 천사를 그 종 요한에게',
    );
    const r = grade(REV_1_1, typed);
    // greedy는 앞→뒤 순방향만 보므로 어순 변경 구간에서 오답 발생
    // 변경 이전 구간("보이시려고" 까지)은 correct
    const chars = r.typedChars.map((c) => c.ch);
    const idxGo = chars.indexOf('고');
    expect(r.typedChars[idxGo]!.status).toBe('correct');
    // 전체 정확도는 50% 이상 (변경 전후 부분은 맞으므로)
    expect(r.accuracy).toBeGreaterThan(50);
  });

  // ─────────────────────────────────────────
  // H. 정확도 범위 검증
  // ─────────────────────────────────────────
  it('H1: 소수 오타만 있으면 90% 이상', () => {
    // 1글자 오타
    const typed = REV_1_1.replace('예수', '에수');
    const r = grade(REV_1_1, typed);
    expect(r.accuracy).toBeGreaterThanOrEqual(90);
  });

  it('H2: 완전히 다른 텍스트 → 25% 미만', () => {
    const typed = '전혀 다른 내용의 문장을 입력합니다 이것은 성경 구절이 아닙니다';
    const r = grade(REV_1_1, typed);
    expect(r.accuracy).toBeLessThan(25);
  });

  it('H3: 빈 입력 → 0%', () => {
    const r = grade(REV_1_1, '');
    expect(r.accuracy).toBe(0);
    expect(r.targetChars.every((c) => c.status === 'pending')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 실시간 타이핑 시뮬레이션 — 입력 중 안정성 테스트
// 앞에 오답이 있는 상태에서 마지막에 한 글자씩 추가할 때
// 이전 채점 결과가 변하지 않아야 한다.
// ═══════════════════════════════════════════════════════════════════
describe('grade — 실시간 타이핑 안정성 (incremental keystroke)', () => {
  const REV_1_1 = '예수 그리스도의 계시라 이는 하나님이 그에게 주사 반드시 속히 될 일을 그 종들에게 보이시려고 그 천사를 그 종 요한에게 보내어 지시하신 것이라';

  /**
   * 한 글자씩 타이핑하면서 이전 결과가 바뀌지 않는지 검증하는 헬퍼.
   *
   * frontierTolerance (기본값 2 = MAX_SKIP_TYPED):
   *   타이핑 최전선의 마지막 N글자는 다음 입력에 의해 판정이 바뀔 수 있다.
   *   typed look-ahead가 아직 입력되지 않은 다음 글자에 의존하기 때문.
   *   예: "그리 " 입력 시 공백이 correct → "그리 스" 입력 시 공백이 wrong으로
   *   전환되는 것은 정상 동작 (공백이 삽입인지 다음 글자를 봐야 판단 가능).
   *   이 범위 바깥의 글자(확정 영역)는 절대 변하지 않아야 한다.
   */
  function assertIncrementalStability(target: string, typed: string, frontierTolerance = 2) {
    const chars = [...typed];
    let prevStatuses: string[] = [];

    for (let len = 1; len <= chars.length; len++) {
      const partial = chars.slice(0, len).join('');
      const r = grade(target, partial);
      const statuses = r.typedChars.map((c) => c.status);

      // 확정 영역(frontier 바깥)만 안정성 검증
      const stableEnd = Math.max(0, prevStatuses.length - frontierTolerance);
      for (let i = 0; i < stableEnd; i++) {
        if (statuses[i] !== prevStatuses[i]) {
          throw new Error(
            `Stability broken at keystroke ${len}, index ${i} (stable zone): ` +
            `was "${prevStatuses[i]}" → became "${statuses[i]}" ` +
            `(typed so far: "${partial}")`
          );
        }
      }
      prevStatuses = statuses;
    }
  }

  // ─────────────────────────────────────────
  // 1. 정확한 입력 중 안정성
  // ─────────────────────────────────────────
  it('정확한 입력을 한 글자씩 추가 — 중간까지', () => {
    // "예수 그리스도의 계시라 이는 하나님이" 까지 정확 입력
    const typed = '예수 그리스도의 계시라 이는 하나님이';
    assertIncrementalStability(REV_1_1, typed);
  });

  // ─────────────────────────────────────────
  // 2. 초반 오타 + 이후 정확 입력
  // ─────────────────────────────────────────
  it('초성 오타 후 정확 입력 계속 — "에수" 오타 후 " 그리스도의 계시라"', () => {
    const typed = '에수 그리스도의 계시라 이는 하나님이 그에게';
    assertIncrementalStability(REV_1_1, typed);
    // 최종 상태에서 '에' 는 partial, 나머지는 correct
    const r = grade(REV_1_1, typed);
    expect(r.typedChars[0]!.status).toBe('partial'); // 에 vs 예
    expect(r.typedChars[1]!.status).toBe('correct'); // 수
    expect(r.typedChars[r.typedChars.length - 1]!.status).toBe('correct');
  });

  it('종성 오타 후 정확 입력 — "하나닌이" 오타 후 " 그에게 주사"', () => {
    // 님→닌 오타
    const typed = '예수 그리스도의 계시라 이는 하나닌이 그에게 주사';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    const idxNin = chars.indexOf('닌');
    expect(r.typedChars[idxNin]!.status).toBe('partial'); // 닌 vs 님
    expect(r.typedChars[idxNin + 1]!.status).toBe('correct'); // 이
  });

  // ─────────────────────────────────────────
  // 3. 공백 누락 + 이후 정확 입력
  // ─────────────────────────────────────────
  it('공백 누락 후 정확 입력 — "계시라이는" 후 " 하나님이 그에게"', () => {
    const typed = '예수 그리스도의 계시라이는 하나님이 그에게 주사';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    // 모든 내용 글자는 correct
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('여러 공백 누락 후 정확 입력 — "그에게주사 반드시속히"', () => {
    const typed = '예수 그리스도의 계시라 이는 하나님이 그에게주사 반드시속히 될';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  // ─────────────────────────────────────────
  // 4. 공백 삽입 + 이후 정확 입력
  // ─────────────────────────────────────────
  it('공백 삽입 후 정확 입력 — "그리 스도의" 후 " 계시라 이는"', () => {
    const typed = '예수 그리 스도의 계시라 이는 하나님이 그에게';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    const wrongChars = r.typedChars.filter((c) => c.status === 'wrong');
    expect(wrongChars).toHaveLength(1);
    expect(wrongChars[0]!.ch).toBe(' ');
  });

  // ─────────────────────────────────────────
  // 5. 단어 건너뛰기 + 이후 정확 입력
  // ─────────────────────────────────────────
  it('단어 건너뛴 후 정확 입력 — "이는" 빠진 채로 "하나님이 그에게 주사"', () => {
    const typed = '예수 그리스도의 계시라 하나님이 그에게 주사 반드시';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  it('긴 구절 건너뛴 후 정확 입력 — "반드시 속히 될 일을" 빠짐', () => {
    const typed = '예수 그리스도의 계시라 이는 하나님이 그에게 주사 그 종들에게 보이시려고';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    expect(r.typedChars.every((c) => c.status === 'correct')).toBe(true);
  });

  // ─────────────────────────────────────────
  // 6. 오타 + 공백 오류 복합, 이후 정확 입력
  // ─────────────────────────────────────────
  it('초반 오타 + 공백 누락, 이후 정확 입력', () => {
    // "에수"(오타) + "그리스도의"(공백 누락) + 이후 정확
    const typed = '에수그리스도의 계시라 이는 하나님이 그에게 주사';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    // '에' partial, 나머지 내용 글자 correct
    expect(r.typedChars[0]!.status).toBe('partial');
    const lastChar = r.typedChars[r.typedChars.length - 1]!;
    expect(lastChar.status).toBe('correct');
  });

  it('오타 + 공백 삽입 후 정확 입력', () => {
    // "카나님이"(오타) + "그에 게"(공백 삽입) + 이후 정확
    const typed = '예수 그리스도의 계시라 이는 카나님이 그에 게 주사 반드시';
    assertIncrementalStability(REV_1_1, typed);
    const r = grade(REV_1_1, typed);
    const chars = r.typedChars.map((c) => c.ch);
    expect(r.typedChars[chars.indexOf('카')]!.status).toBe('partial');
    expect(r.typedChars[chars.lastIndexOf('시')]!.status).toBe('correct');
  });

  // ─────────────────────────────────────────
  // 7. 마지막 글자 정답/오답 전환
  // ─────────────────────────────────────────
  it('마지막 글자를 정답으로 입력 — 이전 결과 불변', () => {
    const base = '예수 그리스도의 계시라 이는 하나님이 그에게 주';
    const r1 = grade(REV_1_1, base);
    const r2 = grade(REV_1_1, base + '사');

    // r1의 모든 결과가 r2의 prefix와 동일
    const s1 = r1.typedChars.map((c) => c.status);
    const s2 = r2.typedChars.map((c) => c.status);
    expect(s2.slice(0, s1.length)).toEqual(s1);
    expect(r2.typedChars[r2.typedChars.length - 1]!.status).toBe('correct');
  });

  it('마지막 글자를 오답으로 입력 — 이전 결과 불변', () => {
    const base = '예수 그리스도의 계시라 이는 하나님이 그에게 주';
    const r1 = grade(REV_1_1, base);
    const r2 = grade(REV_1_1, base + '자'); // 사→자 오타

    const s1 = r1.typedChars.map((c) => c.status);
    const s2 = r2.typedChars.map((c) => c.status);
    expect(s2.slice(0, s1.length)).toEqual(s1);
    expect(r2.typedChars[r2.typedChars.length - 1]!.status).toBe('partial');
  });

  // ─────────────────────────────────────────
  // 8. 끝부분 연속 타이핑 (마지막 5글자)
  // ─────────────────────────────────────────
  it('오타 있는 상태에서 마지막 5글자 순차 입력', () => {
    // "에수"(오타) + "이는" 건너뛰기 + 끝까지 가지 않고 마지막 5글자
    const prefix = '에수 그리스도의 계시라 하나님이 그에게 주사 반드시 속히 될 일을 그 종들에게 보이시려고 그 천사를 그 종 요한에게 보내어 지시하';

    // "신 것이라" 5글자를 한 글자씩 추가
    const endings = ['신', '신 ', '신 것', '신 것이', '신 것이라'];
    let prevStatuses: string[] = [];

    for (const ending of endings) {
      const typed = prefix + ending;
      const r = grade(REV_1_1, typed);
      const statuses = r.typedChars.map((c) => c.status);

      for (let i = 0; i < prevStatuses.length; i++) {
        expect(statuses[i]).toBe(prevStatuses[i]);
      }
      prevStatuses = statuses;
    }

    // 최종 결과 검증
    const rFinal = grade(REV_1_1, prefix + '신 것이라');
    expect(rFinal.typedChars[0]!.status).toBe('partial'); // 에 vs 예
    const last4 = rFinal.typedChars.slice(-4).map((c) => c.status);
    expect(last4).toEqual(['correct', 'correct', 'correct', 'correct']);
  });
});
