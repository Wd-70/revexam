export interface LcsMatch {
  readonly targetIndex: number;
  readonly typedIndex: number;
}

export interface LcsResult {
  readonly matches: readonly LcsMatch[];
  readonly lcsLength: number;
}

export function alignLcs<T>(target: readonly T[], typed: readonly T[]): LcsResult {
  const n = target.length;
  const m = typed.length;
  if (n === 0 || m === 0) return { matches: [], lcsLength: 0 };

  // dp[i][j] = LCS length of target[0..i) and typed[0..j)
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);

  for (let i = 1; i <= n; i++) {
    const ti = target[i - 1];
    const row = dp[i]!;
    const prev = dp[i - 1]!;
    for (let j = 1; j <= m; j++) {
      if (ti === typed[j - 1]) {
        row[j] = prev[j - 1]! + 1;
      } else {
        const a = prev[j]!;
        const b = row[j - 1]!;
        row[j] = a >= b ? a : b;
      }
    }
  }

  // Backtrack with a left-most bias: when a match is possible but the same
  // LCS length is also reachable by skipping the current target token, prefer
  // the skip so the eventual match lands on the smaller targetIndex.
  const matches: LcsMatch[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const here = dp[i]![j]!;
    if (target[i - 1] === typed[j - 1] && dp[i - 1]![j - 1]! + 1 === here) {
      if (dp[i - 1]![j]! === here) {
        i--;
      } else {
        matches.push({ targetIndex: i - 1, typedIndex: j - 1 });
        i--;
        j--;
      }
    } else if (dp[i - 1]![j]! >= dp[i]![j - 1]!) {
      i--;
    } else {
      j--;
    }
  }
  matches.reverse();

  return { matches, lcsLength: dp[n]![m]! };
}
