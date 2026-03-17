/**
 * Fisher-Yates shuffle with a seeded PRNG for deterministic results.
 * Given the same seed, produces the same shuffle every time.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function shuffleArray<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  const rng = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a random integer seed
 */
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1;
}

export interface ShuffledQuestion {
  id: string;
  question_text: string;
  options: string[];
  originalCorrectOption: number;
  /** The new index of the correct answer after option shuffle */
  correctOption: number;
  time_limit: number;
  points: number;
}

/**
 * Takes raw questions, a question order (array of indices), and option orders
 * (map of question index to option permutation), and returns the shuffled questions.
 */
export function applyShuffleOrders(
  rawQuestions: Array<{
    id: string;
    question_text: string;
    options: string[];
    correct_option: number;
    time_limit: number;
    points: number;
  }>,
  questionOrder: number[],
  optionOrders: Record<string, number[]>
): ShuffledQuestion[] {
  return questionOrder.map((qIdx) => {
    const q = rawQuestions[qIdx];
    const optOrder = optionOrders[String(qIdx)] || [0, 1, 2, 3];

    const shuffledOptions = optOrder.map((oi: number) => q.options[oi]);
    const newCorrectIdx = optOrder.indexOf(q.correct_option);

    return {
      id: q.id,
      question_text: q.question_text,
      options: shuffledOptions,
      originalCorrectOption: q.correct_option,
      correctOption: newCorrectIdx,
      time_limit: q.time_limit,
      points: q.points,
    };
  });
}

/**
 * Generate question order and option orders for a set of questions.
 */
export function generateShuffleOrders(questionCount: number, optionCount = 4) {
  const qSeed = generateSeed();
  const questionOrder = shuffleArray(
    Array.from({ length: questionCount }, (_, i) => i),
    qSeed
  );

  const optionOrders: Record<string, number[]> = {};
  for (let i = 0; i < questionCount; i++) {
    const oSeed = generateSeed();
    optionOrders[String(i)] = shuffleArray(
      Array.from({ length: optionCount }, (_, j) => j),
      oSeed
    );
  }

  return { questionOrder, optionOrders };
}
