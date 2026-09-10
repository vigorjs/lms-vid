export function calculateWeightedScore(criteria, submittedScores) {
  const scoreMap = submittedScores instanceof Map ? submittedScores : new Map(submittedScores.map((item) => [item.criterionId, Number(item.score)]));
  if (!criteria.length || criteria.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error("Bobot rubric harus berjumlah 100%.");
  if (criteria.some((item) => !scoreMap.has(item.id) || scoreMap.get(item.id) < 0 || scoreMap.get(item.id) > 100)) throw new Error("Semua skor rubric harus bernilai 0 sampai 100.");
  return criteria.reduce((sum, item) => sum + scoreMap.get(item.id) * item.weight / 100, 0);
}

export function canPassReview(score, threshold) {
  return Number(score) >= Number(threshold);
}
