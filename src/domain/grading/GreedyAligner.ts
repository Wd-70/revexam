/**
 * Greedy left-to-right aligner.
 *
 * Walks typed chars one by one, matching them against target chars using a
 * monotonically-increasing target pointer. Once a target position is consumed
 * it is never revisited, which guarantees that earlier grading results are
 * stable — new input can only affect characters at the current position or
 * later.
 */

export interface AlignedPair {
  /** Index in the target array (-1 if this typed char is extra) */
  readonly targetIndex: number;
  /** Index in the typed array */
  readonly typedIndex: number;
  /** true when target[targetIndex] === typed[typedIndex] (exact char match) */
  readonly exact: boolean;
}

export interface GreedyAlignResult {
  /** One entry per typed char (in order) */
  readonly pairs: readonly AlignedPair[];
  /** How far the target pointer advanced (first unconsumed target index) */
  readonly targetConsumed: number;
}

/**
 * Maximum number of target chars to look ahead when the user skips target text.
 */
const MAX_SKIP_TARGET = 5;

/**
 * Maximum number of typed chars to look ahead for insertion detection.
 * Kept short (1–2) so that a coincidental match far ahead in typed[]
 * doesn't mask a genuine target skip.
 */
const MAX_SKIP_TYPED = 2;

export function greedyAlign(
  target: readonly string[],
  typed: readonly string[],
): GreedyAlignResult {
  const pairs: AlignedPair[] = [];
  let tIdx = 0;

  for (let uIdx = 0; uIdx < typed.length; uIdx++) {
    const uCh = typed[uIdx]!;

    if (tIdx >= target.length) {
      // Typed beyond end of target → extra char
      pairs.push({ targetIndex: -1, typedIndex: uIdx, exact: false });
      continue;
    }

    // 1) Exact match at current target position
    if (uCh === target[tIdx]) {
      pairs.push({ targetIndex: tIdx, typedIndex: uIdx, exact: true });
      tIdx++;
      continue;
    }

    // 2) Typed look-ahead (insertion detection):
    //    If an upcoming typed char matches the current target, the current
    //    typed char is an *insertion* (extra) — do NOT consume the target.
    //    This runs BEFORE target look-ahead so that an extra space doesn't
    //    accidentally jump to a later space in the target.
    //
    //    GUARD: Skip this when the target char is whitespace but typed is not.
    //    Whitespace repeats frequently; without this guard a content char like
    //    '이' would be mis-classified as an insertion because a later typed
    //    space matches the current target space.  The correct interpretation
    //    in that case is "the user omitted a space" (target look-ahead).
    const tCh = target[tIdx]!;
    const skipTypedLookahead = tCh.trim() === '' && uCh.trim() !== '';

    if (!skipTypedLookahead) {
      let isInsertion = false;
      const uLimit = Math.min(uIdx + 1 + MAX_SKIP_TYPED, typed.length);
      for (let k = uIdx + 1; k < uLimit; k++) {
        if (typed[k] === target[tIdx]) {
          isInsertion = true;
          break;
        }
      }

      if (isInsertion) {
        pairs.push({ targetIndex: -1, typedIndex: uIdx, exact: false });
        continue;
      }
    }

    // 3) Target look-ahead: is there an exact match within the next MAX_SKIP
    //    target chars?  If so the user skipped some target chars.
    let found = -1;
    const limit = Math.min(tIdx + 1 + MAX_SKIP_TARGET, target.length);
    for (let k = tIdx + 1; k < limit; k++) {
      if (target[k] === uCh) {
        found = k;
        break;
      }
    }

    if (found !== -1) {
      // Skip target chars between tIdx and found (they will be marked wrong/skipped)
      pairs.push({ targetIndex: found, typedIndex: uIdx, exact: true });
      tIdx = found + 1;
    } else {
      // 4) Substitution — pair with current target char (jamo comparison)
      pairs.push({ targetIndex: tIdx, typedIndex: uIdx, exact: false });
      tIdx++;
    }
  }

  return { pairs, targetConsumed: tIdx };
}
