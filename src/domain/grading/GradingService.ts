import { decomposeChar } from './HangulDecomposer';
import { alignLcs } from './LcsAligner';

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
  const typedChars = [...typed.normalize('NFC')];

  if (targetChars.length === 0) {
    return { targetChars: [], typedChars: [], accuracy: 0 };
  }

  if (typedChars.length === 0) {
    const tc = targetChars.map((ch) => {
      const j = decomposeChar(ch);
      return { ch, status: 'pending' as const, matchedJamo: 0, totalJamo: j.length, skippedBefore: 0 };
    });
    return { targetChars: tc, typedChars: [], accuracy: 0 };
  }

  // ── 1. Character-level LCS for structural alignment ──
  const { matches: anchors } = alignLcs(targetChars, typedChars);

  const targetResult: GradedChar[] = [];
  const typedResult: GradedChar[] = [];
  let totalMatchedJamo = 0;

  let prevTargetEnd = 0;
  let prevTypedEnd = 0;
  let skippedAccum = 0;

  // ── 2. Walk anchors; process gaps between them ──
  for (let a = 0; a <= anchors.length; a++) {
    const isLastSegment = a === anchors.length;
    const anchorTargetIdx = isLastSegment ? targetChars.length : anchors[a]!.targetIndex;
    const anchorTypedIdx = isLastSegment ? typedChars.length : anchors[a]!.typedIndex;

    // Gap chars between previous anchor and this one
    const gapTargetLen = anchorTargetIdx - prevTargetEnd;
    const gapTypedLen = anchorTypedIdx - prevTypedEnd;
    const pairedLen = Math.min(gapTargetLen, gapTypedLen);

    // Positional pairs — compare jamo at same positions
    for (let k = 0; k < pairedLen; k++) {
      const tCh = targetChars[prevTargetEnd + k]!;
      const uCh = typedChars[prevTypedEnd + k]!;
      const cmp = compareCharJamo(tCh, uCh);
      targetResult.push({
        ch: tCh, status: statusOf(cmp.targetMatched, cmp.targetTotal),
        matchedJamo: cmp.targetMatched, totalJamo: cmp.targetTotal, skippedBefore: 0,
      });
      typedResult.push({
        ch: uCh, status: statusOf(cmp.typedMatched, cmp.typedTotal),
        matchedJamo: cmp.typedMatched, totalJamo: cmp.typedTotal,
        skippedBefore: k === 0 ? skippedAccum : 0,
      });
      if (k === 0) skippedAccum = 0;
      totalMatchedJamo += cmp.targetMatched;
    }

    // Unpaired target chars (more target than typed in gap)
    for (let k = pairedLen; k < gapTargetLen; k++) {
      const tCh = targetChars[prevTargetEnd + k]!;
      const j = decomposeChar(tCh);
      const status: GradedStatus = isLastSegment ? 'pending' : 'wrong';
      targetResult.push({ ch: tCh, status, matchedJamo: 0, totalJamo: j.length, skippedBefore: 0 });
      if (!isLastSegment) skippedAccum++;
    }

    // Extra typed chars (more typed than target in gap)
    for (let k = pairedLen; k < gapTypedLen; k++) {
      const uCh = typedChars[prevTypedEnd + k]!;
      const j = decomposeChar(uCh);
      typedResult.push({
        ch: uCh, status: 'wrong', matchedJamo: 0, totalJamo: j.length,
        skippedBefore: k === pairedLen ? skippedAccum : 0,
      });
      if (k === pairedLen) skippedAccum = 0;
    }

    // The anchor itself (exact character match → all jamo correct)
    if (!isLastSegment) {
      const tCh = targetChars[anchorTargetIdx]!;
      const uCh = typedChars[anchorTypedIdx]!;
      const jLen = decomposeChar(tCh).length;
      targetResult.push({ ch: tCh, status: 'correct', matchedJamo: jLen, totalJamo: jLen, skippedBefore: 0 });
      typedResult.push({ ch: uCh, status: 'correct', matchedJamo: jLen, totalJamo: jLen, skippedBefore: skippedAccum });
      skippedAccum = 0;
      totalMatchedJamo += jLen;
      prevTargetEnd = anchorTargetIdx + 1;
      prevTypedEnd = anchorTypedIdx + 1;
    }
  }

  const totalTargetJamo = targetChars.reduce(
    (sum, ch) => sum + decomposeChar(ch).length, 0
  );
  const accuracy = totalTargetJamo > 0
    ? Math.round((totalMatchedJamo / totalTargetJamo) * 100)
    : 0;

  return { targetChars: targetResult, typedChars: typedResult, accuracy };
}
