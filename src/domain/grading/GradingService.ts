import { decomposeChar } from './HangulDecomposer';
import { greedyAlign } from './GreedyAligner';

export type GradedStatus = 'correct' | 'partial' | 'wrong' | 'pending';

export interface GradedChar {
  readonly ch: string;
  readonly status: GradedStatus;
  readonly matchedJamo: number;
  readonly totalJamo: number;
  /** How many target chars were skipped (not covered by any typed char) before this one. */
  readonly skippedBefore: number;
}

export interface GradeResult {
  /** Target-perspective: each target character graded (for test result review) */
  readonly targetChars: readonly GradedChar[];
  /** Typed-perspective: each typed character graded (for practice real-time) */
  readonly typedChars: readonly GradedChar[];
  readonly accuracy: number;
}

/**
 * Positional jamo comparison between two characters.
 * Compares decomposed jamo at the same index (초성↔초성, 중성↔중성, 종성↔종성).
 */
function compareCharJamo(targetCh: string, typedCh: string) {
  const tJ = decomposeChar(targetCh);
  const uJ = decomposeChar(typedCh);
  const minLen = Math.min(tJ.length, uJ.length);
  let matched = 0;
  for (let k = 0; k < minLen; k++) {
    if (tJ[k] === uJ[k]) matched++;
  }
  return {
    targetMatched: matched,
    targetTotal: tJ.length,
    typedMatched: matched,
    typedTotal: uJ.length,
  };
}

function statusOf(matched: number, total: number): GradedStatus {
  if (matched === total && total > 0) return 'correct';
  if (matched > 0) return 'partial';
  return 'wrong';
}

export function grade(target: string, typed: string): GradeResult {
  const targetChars = [...target.normalize('NFC')];
  // Keep original chars for display (c.ch), but normalize newlines to spaces
  // for alignment matching so Enter between verses is accepted as a space.
  const typedRaw = [...typed.normalize('NFC')];
  const typedChars = typedRaw.map(ch => /\r?\n/.test(ch) ? ' ' : ch);

  if (targetChars.length === 0) {
    return { targetChars: [], typedChars: [], accuracy: 0 };
  }

  if (typedRaw.length === 0) {
    const tc = targetChars.map((ch) => {
      const j = decomposeChar(ch);
      return { ch, status: 'pending' as const, matchedJamo: 0, totalJamo: j.length, skippedBefore: 0 };
    });
    return { targetChars: tc, typedChars: [], accuracy: 0 };
  }

  // ── 1. Greedy forward alignment ──
  const { pairs, targetConsumed } = greedyAlign(targetChars, typedChars);

  // Build a map: targetIndex → pair (for covered target chars)
  const targetCovered = new Map<number, { typedIndex: number; exact: boolean }>();
  for (const p of pairs) {
    if (p.targetIndex >= 0) {
      targetCovered.set(p.targetIndex, { typedIndex: p.typedIndex, exact: p.exact });
    }
  }

  // ── 2. Build target-perspective result ──
  const targetResult: GradedChar[] = [];
  let totalMatchedJamo = 0;

  for (let tIdx = 0; tIdx < targetChars.length; tIdx++) {
    const tCh = targetChars[tIdx]!;
    const tJamo = decomposeChar(tCh);
    const covered = targetCovered.get(tIdx);

    if (covered) {
      if (covered.exact) {
        // Exact character match → all jamo correct
        targetResult.push({
          ch: tCh, status: 'correct',
          matchedJamo: tJamo.length, totalJamo: tJamo.length, skippedBefore: 0,
        });
        totalMatchedJamo += tJamo.length;
      } else {
        // Inexact → jamo comparison
        const uCh = typedChars[covered.typedIndex]!;
        const cmp = compareCharJamo(tCh, uCh);
        targetResult.push({
          ch: tCh, status: statusOf(cmp.targetMatched, cmp.targetTotal),
          matchedJamo: cmp.targetMatched, totalJamo: cmp.targetTotal, skippedBefore: 0,
        });
        totalMatchedJamo += cmp.targetMatched;
      }
    } else if (tIdx >= targetConsumed) {
      // Beyond what was consumed → pending
      targetResult.push({
        ch: tCh, status: 'pending',
        matchedJamo: 0, totalJamo: tJamo.length, skippedBefore: 0,
      });
    } else {
      // Within consumed range but not covered → skipped (wrong)
      targetResult.push({
        ch: tCh, status: 'wrong',
        matchedJamo: 0, totalJamo: tJamo.length, skippedBefore: 0,
      });
    }
  }

  // ── 3. Build typed-perspective result ──
  const typedResult: GradedChar[] = [];

  // Pre-compute skippedBefore for each typed char:
  // Count target chars that were skipped (uncovered) between the previous
  // pair's target position and this pair's target position.
  let prevTargetEnd = 0; // next expected target index
  for (const p of pairs) {
    if (p.targetIndex >= 0) {
      let skipped = 0;
      for (let t = prevTargetEnd; t < p.targetIndex; t++) {
        if (!targetCovered.has(t)) skipped++;
      }

      const tCh = targetChars[p.targetIndex]!;
      const uCh = typedChars[p.typedIndex]!;
      const uChRaw = typedRaw[p.typedIndex]!;

      if (p.exact) {
        const jLen = decomposeChar(tCh).length;
        typedResult.push({
          ch: uChRaw, status: 'correct',
          matchedJamo: jLen, totalJamo: jLen, skippedBefore: skipped,
        });
      } else {
        const cmp = compareCharJamo(tCh, uCh);
        typedResult.push({
          ch: uChRaw, status: statusOf(cmp.typedMatched, cmp.typedTotal),
          matchedJamo: cmp.typedMatched, totalJamo: cmp.typedTotal, skippedBefore: skipped,
        });
      }

      prevTargetEnd = p.targetIndex + 1;
    } else {
      // Extra typed char (beyond target)
      const uCh = typedChars[p.typedIndex]!;
      const uChRaw = typedRaw[p.typedIndex]!;
      const uJamo = decomposeChar(uCh);
      typedResult.push({
        ch: uChRaw, status: 'wrong',
        matchedJamo: 0, totalJamo: uJamo.length, skippedBefore: 0,
      });
    }
  }

  // ── 4. Accuracy ──
  const totalTargetJamo = targetChars.reduce(
    (sum, ch) => sum + decomposeChar(ch).length, 0
  );
  const accuracy = totalTargetJamo > 0
    ? Math.round((totalMatchedJamo / totalTargetJamo) * 100)
    : 0;

  return { targetChars: targetResult, typedChars: typedResult, accuracy };
}
