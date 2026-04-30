import { describe, expect, it } from 'vitest';
import { alignLcs } from './LcsAligner';

describe('alignLcs', () => {
  it('returns empty matches for two empty inputs', () => {
    const r = alignLcs([], []);
    expect(r.matches).toEqual([]);
    expect(r.lcsLength).toBe(0);
  });

  it('returns empty matches when one side is empty', () => {
    expect(alignLcs(['a'], []).matches).toEqual([]);
    expect(alignLcs([], ['a']).matches).toEqual([]);
  });

  it('matches identical sequences index-for-index', () => {
    const r = alignLcs(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(r.lcsLength).toBe(3);
    expect(r.matches).toEqual([
      { targetIndex: 0, typedIndex: 0 },
      { targetIndex: 1, typedIndex: 1 },
      { targetIndex: 2, typedIndex: 2 },
    ]);
  });

  it('skips a missing token in typed without breaking subsequent alignment', () => {
    // target: a b c d, typed: a c d → b is skipped
    const r = alignLcs(['a', 'b', 'c', 'd'], ['a', 'c', 'd']);
    expect(r.lcsLength).toBe(3);
    expect(r.matches).toEqual([
      { targetIndex: 0, typedIndex: 0 },
      { targetIndex: 2, typedIndex: 1 },
      { targetIndex: 3, typedIndex: 2 },
    ]);
  });

  it('handles extra tokens inserted in typed', () => {
    // target: a b c, typed: a x b c
    const r = alignLcs(['a', 'b', 'c'], ['a', 'x', 'b', 'c']);
    expect(r.lcsLength).toBe(3);
    expect(r.matches).toEqual([
      { targetIndex: 0, typedIndex: 0 },
      { targetIndex: 1, typedIndex: 2 },
      { targetIndex: 2, typedIndex: 3 },
    ]);
  });

  it('returns no matches for fully disjoint sequences', () => {
    expect(alignLcs(['a', 'b'], ['x', 'y']).lcsLength).toBe(0);
  });

  it('matches in a stable left-most order on ties', () => {
    // target: a a, typed: a — should match the first a
    const r = alignLcs(['a', 'a'], ['a']);
    expect(r.matches).toEqual([{ targetIndex: 0, typedIndex: 0 }]);
  });
});
