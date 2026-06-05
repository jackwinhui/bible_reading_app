export type WordResult =
  | { kind: 'correct'; word: string }
  | { kind: 'wrong'; word: string; expected: string }
  | { kind: 'missing'; expected: string }
  | { kind: 'extra'; word: string };

export interface ComparisonResult {
  score: number;
  totalWords: number;
  correctWords: number;
  missingWords: number;
  extraWords: number;
  wrongWords: number;
  words: WordResult[];
}

function normalize(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function stripPunctuation(word: string): string {
  return word.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '').toLowerCase();
}

function wordsEqual(a: string, b: string): boolean {
  return stripPunctuation(a) === stripPunctuation(b);
}

/**
 * LCS-based alignment. Returns a sequence of ops describing how to transform
 * `typed` into `actual`: 'correct' (matched), 'extra' (typed but not in
 * actual), 'missing' (in actual but not typed). Adjacent extra+missing
 * pairs are then collapsed into 'wrong' (a substitution at the right spot).
 */
function alignWords(typed: string[], actual: string[]): WordResult[] {
  const n = typed.length;
  const m = actual.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (wordsEqual(typed[i - 1], actual[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: WordResult[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (wordsEqual(typed[i - 1], actual[j - 1])) {
      ops.unshift({ kind: 'correct', word: typed[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.unshift({ kind: 'extra', word: typed[i - 1] });
      i--;
    } else {
      ops.unshift({ kind: 'missing', expected: actual[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    ops.unshift({ kind: 'extra', word: typed[i - 1] });
    i--;
  }
  while (j > 0) {
    ops.unshift({ kind: 'missing', expected: actual[j - 1] });
    j--;
  }

  // Collapse adjacent extra + missing pairs into a single 'wrong' (substitution)
  const collapsed: WordResult[] = [];
  for (let k = 0; k < ops.length; k++) {
    const cur = ops[k];
    const next = ops[k + 1];
    if (cur && next && cur.kind === 'extra' && next.kind === 'missing') {
      collapsed.push({ kind: 'wrong', word: cur.word, expected: next.expected });
      k++;
    } else if (cur && next && cur.kind === 'missing' && next.kind === 'extra') {
      collapsed.push({ kind: 'wrong', word: next.word, expected: cur.expected });
      k++;
    } else {
      collapsed.push(cur);
    }
  }

  return collapsed;
}

export function compareVerses(typed: string, actual: string): ComparisonResult {
  const typedWords = tokenize(typed);
  const actualWords = tokenize(actual);

  if (typedWords.length === 0) {
    return {
      score: 0,
      totalWords: actualWords.length,
      correctWords: 0,
      missingWords: actualWords.length,
      extraWords: 0,
      wrongWords: 0,
      words: actualWords.map((w) => ({ kind: 'missing', expected: w })),
    };
  }

  const words = alignWords(typedWords, actualWords);

  let correctWords = 0;
  let missingWords = 0;
  let extraWords = 0;
  let wrongWords = 0;
  for (const w of words) {
    if (w.kind === 'correct') correctWords++;
    else if (w.kind === 'missing') missingWords++;
    else if (w.kind === 'extra') extraWords++;
    else if (w.kind === 'wrong') wrongWords++;
  }

  // Score: correct / max(actual, typed) so padding the answer with junk
  // doesn't trivially boost the score; missing words are reflected in the
  // denominator naturally.
  const denom = Math.max(actualWords.length, typedWords.length, 1);
  const score = Math.round((correctWords / denom) * 100);

  return {
    score,
    totalWords: actualWords.length,
    correctWords,
    missingWords,
    extraWords,
    wrongWords,
    words,
  };
}
