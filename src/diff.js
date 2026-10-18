/** Unified diff of two texts. Used by `tesso add --diff`. */
export function unifiedDiff(label, before, after) {
  const a = before.replace(/\n$/, "").split("\n");
  const b = after.replace(/\n$/, "").split("\n");
  const lcs = longestCommon(a, b);
  const lines = [`--- ${label}`, `+++ ${label}`];
  let i = 0;
  let j = 0;
  for (const [ai, bi] of lcs) {
    while (i < ai) lines.push(`-${a[i++]}`);
    while (j < bi) lines.push(`+${b[j++]}`);
    lines.push(` ${a[i]}`);
    i += 1;
    j += 1;
  }
  while (i < a.length) lines.push(`-${a[i++]}`);
  while (j < b.length) lines.push(`+${b[j++]}`);
  return lines.join("\n");
}

function longestCommon(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i += 1;
    else j += 1;
  }
  return pairs;
}
