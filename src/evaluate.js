function toPairs(groups) {
  const pairs = new Set();

  for (const group of groups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pairs.add(`${group[i]}|${group[j]}`);
      }
    }
  }
  return pairs;
}

export function evaluate(predicted, groundTruth) {
  const predPairs = toPairs(predicted.groups);
  const gtPairs = toPairs(groundTruth.groups);

  let tp = 0,
    fp = 0,
    fn = 0;

  for (const p of predPairs) {
    gtPairs.has(p) ? tp++ : fp++;
  }

  for (const g of gtPairs) {
    if (!predPairs.has(g)) fn++;
  }

  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  return { precision, recall, f1 };
}
