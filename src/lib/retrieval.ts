import scriptures from "./scriptures.json";

export interface Passage {
  id: string;
  tradition: string;
  source: string;
  text: string;
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "do", "for",
  "from", "had", "has", "have", "he", "her", "his", "how", "i", "if",
  "in", "into", "is", "it", "its", "me", "my", "no", "not", "of", "on",
  "or", "our", "she", "so", "some", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "this", "to", "up", "us",
  "was", "we", "what", "when", "which", "who", "why", "will", "with",
  "you", "your", "can", "does", "did", "about", "been", "would", "could",
  "should", "just", "more", "also", "very", "all", "any", "each", "one",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

interface DocVector {
  passage: Passage;
  tf: Map<string, number>;
  magnitude: number;
}

const allPassages: Passage[] = scriptures as Passage[];

// Precompute document frequency for each term
const docFrequency = new Map<string, number>();
const docVectors: DocVector[] = [];

(function buildIndex() {
  const N = allPassages.length;
  const rawTfs: Map<string, number>[] = [];

  for (const passage of allPassages) {
    const tokens = tokenize(`${passage.text} ${passage.source} ${passage.tradition}`);
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    rawTfs.push(tf);

    // Use Array.from to avoid Set iteration TS error
    const seen = Array.from(new Set(tokens));
    seen.forEach((t) => {
      docFrequency.set(t, (docFrequency.get(t) ?? 0) + 1);
    });
  }

  for (let i = 0; i < N; i++) {
    const tf = rawTfs[i];
    const tfidf = new Map<string, number>();
    let mag = 0;

    // Use Array.from to avoid Map iteration TS error
    Array.from(tf.entries()).forEach(([term, count]) => {
      const df = docFrequency.get(term) ?? 1;
      const score = count * Math.log(N / df);
      tfidf.set(term, score);
      mag += score * score;
    });

    docVectors.push({
      passage: allPassages[i],
      tf: tfidf,
      magnitude: Math.sqrt(mag),
    });
  }
})();

export function retrievePassages(query: string, topK: number = 3): Passage[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const N = allPassages.length;
  const queryTf = new Map<string, number>();
  for (const t of tokens) {
    queryTf.set(t, (queryTf.get(t) ?? 0) + 1);
  }

  const queryVec = new Map<string, number>();
  let queryMag = 0;

  // Use Array.from to avoid Map iteration TS error
  Array.from(queryTf.entries()).forEach(([term, count]) => {
    const df = docFrequency.get(term) ?? 1;
    const score = count * Math.log(N / df);
    queryVec.set(term, score);
    queryMag += score * score;
  });
  queryMag = Math.sqrt(queryMag);

  if (queryMag === 0) return [];

  const scored = docVectors.map((doc) => {
    let dot = 0;
    // Use Array.from to avoid Map iteration TS error
    Array.from(queryVec.entries()).forEach(([term, qScore]) => {
      const dScore = doc.tf.get(term) ?? 0;
      dot += qScore * dScore;
    });
    const similarity = doc.magnitude > 0 ? dot / (queryMag * doc.magnitude) : 0;
    return { passage: doc.passage, score: similarity };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK);
  const strong = top.filter((s) => s.score > 0.05);
  // If the threshold filters everything out, still return the best matches so
  // the model always gets *some* grounding text (avoids "empty retrieval" loops).
  const chosen = strong.length > 0 ? strong : top;
  return chosen.map((s) => s.passage);
}
