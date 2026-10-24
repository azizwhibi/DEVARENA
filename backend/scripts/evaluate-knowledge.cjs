// Offline human-judgment evaluation. This never writes application metrics.
const fs = require('node:fs');
function metrics(ranked, judgments, k = 5) {
  if (!Array.isArray(ranked) || new Set(ranked).size !== ranked.length)
    throw new Error('Rankings must contain unique resource IDs.');
  const top = ranked.slice(0, k);
  for (const id of top)
    if (!Object.hasOwn(judgments, id))
      throw new Error('Missing human judgment for ' + id);
  const rating = (id) => {
    const value = judgments[id];
    if (![0, 1, 2].includes(value))
      throw new Error('Judgments must be 0, 1 or 2.');
    return value;
  };
  const dcg = top.reduce(
    (sum, id, index) =>
      sum + (Math.pow(2, rating(id)) - 1) / Math.log2(index + 2),
    0,
  );
  const ideal = Object.keys(judgments)
    .map(rating)
    .sort((a, b) => b - a)
    .slice(0, k)
    .reduce(
      (sum, value, index) =>
        sum + (Math.pow(2, value) - 1) / Math.log2(index + 2),
      0,
    );
  return {
    precisionAt5: top.filter((id) => rating(id) > 0).length / k,
    ndcgAt5: ideal ? dcg / ideal : 0,
  };
}
function evaluate(input) {
  if (input.version !== 1 || !Array.isArray(input.cases) || !input.cases.length)
    throw new Error('Provide human-reviewed cases using format version 1.');
  const result = input.cases.map((item) => ({
    case_id: item.case_id,
    baseline: metrics(item.baseline, item.judgments),
    semantic: item.semantic ? metrics(item.semantic, item.judgments) : null,
  }));
  function average(method, key) {
    const values = result
      .filter((row) => row[method] !== null)
      .map((row) => row[method][key]);
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  }
  return {
    cases: result.length,
    semanticCases: result.filter((row) => row.semantic !== null).length,
    baseline: {
      precisionAt5: average('baseline', 'precisionAt5'),
      ndcgAt5: average('baseline', 'ndcgAt5'),
    },
    semantic: {
      precisionAt5: average('semantic', 'precisionAt5'),
      ndcgAt5: average('semantic', 'ndcgAt5'),
    },
    perCase: result,
  };
}
module.exports = { metrics, evaluate };
if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file)
      throw new Error(
        'Usage: node scripts/evaluate-knowledge.cjs <human-review.json>',
      );
    console.log(
      JSON.stringify(
        evaluate(JSON.parse(fs.readFileSync(file, 'utf8'))),
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
