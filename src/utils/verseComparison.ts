export interface ComparisonResult {
  score: number;
  totalWords: number;
  correctWords: number;
  words: { word: string; correct: boolean; expected: string }[];
}

function normalize(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/—/g, '-')
    .replace(/…/g, '...')
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

export function compareVerses(typed: string, actual: string): ComparisonResult {
  const typedWords = tokenize(typed);
  const actualWords = tokenize(actual);

  if (typedWords.length === 0) {
    return {
      score: 0,
      totalWords: actualWords.length,
      correctWords: 0,
      words: actualWords.map((w) => ({ word: '', correct: false, expected: w })),
    };
  }

  const words: { word: string; correct: boolean; expected: string }[] = [];
  let correctCount = 0;
  const maxLen = Math.max(typedWords.length, actualWords.length);

  for (let i = 0; i < maxLen; i++) {
    const typed_w = typedWords[i] || '';
    const actual_w = actualWords[i] || '';
    const isCorrect =
      typed_w !== '' &&
      actual_w !== '' &&
      stripPunctuation(typed_w) === stripPunctuation(actual_w);

    if (isCorrect) correctCount++;
    words.push({ word: typed_w, correct: isCorrect, expected: actual_w });
  }

  const score = actualWords.length > 0 ? Math.round((correctCount / actualWords.length) * 100) : 0;

  return {
    score,
    totalWords: actualWords.length,
    correctWords: correctCount,
    words,
  };
}
