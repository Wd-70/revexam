import { describe, expect, it } from 'vitest';
import { greedyAlign } from './GreedyAligner';

describe('greedyAlign', () => {
  it('returns empty pairs for empty inputs', () => {
    const r = greedyAlign([], []);
    expect(r.pairs).toEqual([]);
    expect(r.targetConsumed).toBe(0);
  });

  it('returns empty pairs when typed is empty', () => {
    const r = greedyAlign(['가', '나'], []);
    expect(r.pairs).toEqual([]);
    expect(r.targetConsumed).toBe(0);
  });

  it('marks extra typed chars when target is empty', () => {
    const r = greedyAlign([], ['가']);
    expect(r.pairs).toEqual([{ targetIndex: -1, typedIndex: 0, exact: false }]);
    expect(r.targetConsumed).toBe(0);
  });

  it('matches exact 1:1 sequence', () => {
    const r = greedyAlign(['가', '나', '다'], ['가', '나', '다']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: 1, typedIndex: 1, exact: true },
      { targetIndex: 2, typedIndex: 2, exact: true },
    ]);
    expect(r.targetConsumed).toBe(3);
  });

  it('skips target chars when typed skips (가다 vs 가나다)', () => {
    const r = greedyAlign(['가', '나', '다'], ['가', '다']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: 2, typedIndex: 1, exact: true },
    ]);
    expect(r.targetConsumed).toBe(3);
  });

  it('pairs mismatched chars with current target (jamo fallback)', () => {
    // '한' vs '안' — not exact, pairs at same position
    const r = greedyAlign(['한'], ['안']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: false },
    ]);
    expect(r.targetConsumed).toBe(1);
  });

  it('marks extra typed chars beyond target length', () => {
    const r = greedyAlign(['가'], ['가', '나', '다']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: -1, typedIndex: 1, exact: false },
      { targetIndex: -1, typedIndex: 2, exact: false },
    ]);
    expect(r.targetConsumed).toBe(1);
  });

  it('target pointer never goes backwards (monotonic)', () => {
    const r = greedyAlign(
      ['가', '나', '다', '라', '마'],
      ['나', '라', '마'],
    );
    let prevTarget = -1;
    for (const p of r.pairs) {
      if (p.targetIndex >= 0) {
        expect(p.targetIndex).toBeGreaterThan(prevTarget);
        prevTarget = p.targetIndex;
      }
    }
  });

  it('handles skip with look-ahead within MAX_SKIP', () => {
    // target: A B C D E, typed: A D
    // A matches at 0, D found via look-ahead at index 3 (skip B,C)
    const r = greedyAlign(['A', 'B', 'C', 'D', 'E'], ['A', 'D']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: 3, typedIndex: 1, exact: true },
    ]);
    expect(r.targetConsumed).toBe(4);
  });

  it('does not look ahead beyond MAX_SKIP_TARGET (15)', () => {
    // target: A + 16 x's + B, typed: A B
    // After matching A at 0, tIdx=1. Look-ahead checks indices 2..16 (15 positions).
    // B is at index 17 — beyond the look-ahead window.
    const target = ['A', ...Array(16).fill('x'), 'B'];
    const r = greedyAlign(target, ['A', 'B']);
    expect(r.pairs[0]).toEqual({ targetIndex: 0, typedIndex: 0, exact: true });
    // B was not found within skip range, so it pairs with target[1]='x' as inexact
    expect(r.pairs[1]!.exact).toBe(false);
    expect(r.pairs[1]!.targetIndex).toBe(1);
  });

  it('finds target match within MAX_SKIP_TARGET=15 range', () => {
    // target: A + 14 x's + B, typed: A B → B is at index 15, within range
    const target = ['A', ...Array(14).fill('x'), 'B'];
    const r = greedyAlign(target, ['A', 'B']);
    expect(r.pairs[0]).toEqual({ targetIndex: 0, typedIndex: 0, exact: true });
    expect(r.pairs[1]!.exact).toBe(true);
    expect(r.pairs[1]!.targetIndex).toBe(15);
  });

  it('treats extra space as insertion, not substitution', () => {
    // target: 가나다라, typed: 가나 다라 (extra space inserted)
    // Space should be marked extra (targetIndex=-1), rest should match
    const r = greedyAlign(
      ['가', '나', '다', '라'],
      ['가', '나', ' ', '다', '라'],
    );
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: 1, typedIndex: 1, exact: true },
      { targetIndex: -1, typedIndex: 2, exact: false }, // extra space
      { targetIndex: 2, typedIndex: 3, exact: true },
      { targetIndex: 3, typedIndex: 4, exact: true },
    ]);
  });

  it('treats multiple inserted chars as extra without consuming target', () => {
    // target: AB, typed: AxxB — x,x are insertions
    const r = greedyAlign(['A', 'B'], ['A', 'x', 'x', 'B']);
    expect(r.pairs).toEqual([
      { targetIndex: 0, typedIndex: 0, exact: true },
      { targetIndex: -1, typedIndex: 1, exact: false },
      { targetIndex: -1, typedIndex: 2, exact: false },
      { targetIndex: 1, typedIndex: 3, exact: true },
    ]);
  });

  it('prefers target skip over typed look-ahead when match is far in typed', () => {
    // target: 이는 하나님이, typed: 하나님이
    // '하' vs '이': typed look-ahead (max 2) checks 나,님 — no '이' found
    // target look-ahead finds '하' at target[3] → correct skip
    const target = ['이', '는', ' ', '하', '나', '님', '이'];
    const typed = ['하', '나', '님', '이'];
    const r = greedyAlign(target, typed);
    expect(r.pairs[0]).toEqual({ targetIndex: 3, typedIndex: 0, exact: true });
    expect(r.pairs[1]).toEqual({ targetIndex: 4, typedIndex: 1, exact: true });
    expect(r.pairs[2]).toEqual({ targetIndex: 5, typedIndex: 2, exact: true });
    expect(r.pairs[3]).toEqual({ targetIndex: 6, typedIndex: 3, exact: true });
  });

  it('stability: prefix grading does not change when more chars are typed', () => {
    const target = ['가', '나', '다', '라'];
    const typed1 = ['가', '나'];
    const typed2 = ['가', '나', '다'];

    const r1 = greedyAlign(target, typed1);
    const r2 = greedyAlign(target, typed2);

    // The first two pairs must be identical
    expect(r2.pairs.slice(0, 2)).toEqual(r1.pairs);
  });
});
