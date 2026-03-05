function toPairs(groups) {
  const pairs = new Set();

  // Validate input
  if (!groups || !Array.isArray(groups)) {
    return pairs; // Return empty set if invalid
  }

  for (const group of groups) {
    // Skip if group is not an array
    if (!Array.isArray(group)) {
      continue;
    }
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        pairs.add(`${group[i]}|${group[j]}`);
      }
    }
  }
  return pairs;
}

function parsePair(pairStr) {
  return pairStr.split("|");
}

/**
 * Enhanced evaluation with detailed comparison to ground truth
 */
export function evaluate(predicted, groundTruth) {
  // Validate inputs and ensure groups array exists
  if (!predicted || !predicted.groups || !Array.isArray(predicted.groups)) {
    predicted = { groups: [] };
  }
  if (!groundTruth || !groundTruth.groups || !Array.isArray(groundTruth.groups)) {
    groundTruth = { groups: [] };
  }

  const predPairs = toPairs(predicted.groups);
  const gtPairs = toPairs(groundTruth.groups);

  // Calculate metrics
  const truePositives = [];
  const falsePositives = [];
  const falseNegatives = [];

  for (const p of predPairs) {
    if (gtPairs.has(p)) {
      truePositives.push(p);
    } else {
      falsePositives.push(p);
    }
  }

  for (const g of gtPairs) {
    if (!predPairs.has(g)) {
      falseNegatives.push(g);
    }
  }

  const tp = truePositives.length;
  const fp = falsePositives.length;
  const fn = falseNegatives.length;

  const precision = tp / (tp + fp || 1);
  const recall = tp / (tp + fn || 1);
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  return {
    precision,
    recall,
    f1,
    tp,
    fp,
    fn,
    truePositives: truePositives.map(parsePair),
    falsePositives: falsePositives.map(parsePair),
    falseNegatives: falseNegatives.map(parsePair),
  };
}

/**
 * Detailed comparison analysis between predicted and ground truth
 */
export function compareWithGroundTruth(predicted, groundTruth, methodName) {
  const metrics = evaluate(predicted, groundTruth);

  const comparison = {
    method: methodName,
    metrics: {
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      truePositives: metrics.tp,
      falsePositives: metrics.fp,
      falseNegatives: metrics.fn,
    },
    correctGroupings: metrics.truePositives,
    incorrectGroupings: metrics.falsePositives,
    missedGroupings: metrics.falseNegatives,
    predictedGroups: predicted.groups,
    groundTruthGroups: groundTruth.groups,
  };

  return comparison;
}

/**
 * Format comparison for display
 */
export function formatComparison(comparison) {
  const lines = [];
  lines.push("\n" + "=".repeat(70));
  lines.push(`COMPARISON: ${comparison.method} vs Ground Truth`);
  lines.push("=".repeat(70));

  lines.push("\n📊 METRICS:");
  lines.push(`   Precision: ${comparison.metrics.precision.toFixed(3)} (${comparison.metrics.truePositives} correct / ${comparison.metrics.truePositives + comparison.metrics.falsePositives} predicted)`);
  lines.push(`   Recall:    ${comparison.metrics.recall.toFixed(3)} (${comparison.metrics.truePositives} found / ${comparison.metrics.truePositives + comparison.metrics.falseNegatives} total in ground truth)`);
  lines.push(`   F1-Score:  ${comparison.metrics.f1.toFixed(3)}`);

  lines.push("\n✅ CORRECTLY IDENTIFIED PAIRS (True Positives):");
  if (comparison.correctGroupings.length === 0) {
    lines.push("   None");
  } else {
    comparison.correctGroupings.forEach((pair, idx) => {
      lines.push(`   ${idx + 1}. "${pair[0]}" ↔ "${pair[1]}"`);
    });
  }

  lines.push("\n❌ INCORRECTLY GROUPED PAIRS (False Positives):");
  if (comparison.incorrectGroupings.length === 0) {
    lines.push("   None - Perfect precision!");
  } else {
    comparison.incorrectGroupings.forEach((pair, idx) => {
      lines.push(`   ${idx + 1}. "${pair[0]}" ↔ "${pair[1]}" (NOT equivalent in ground truth)`);
    });
  }

  lines.push("\n⚠️  MISSED PAIRS (False Negatives):");
  if (comparison.missedGroupings.length === 0) {
    lines.push("   None - Perfect recall!");
  } else {
    comparison.missedGroupings.forEach((pair, idx) => {
      lines.push(`   ${idx + 1}. "${pair[0]}" ↔ "${pair[1]}" (Should be grouped but wasn't)`);
    });
  }

  lines.push("\n📋 PREDICTED GROUPS:");
  comparison.predictedGroups.forEach((group, idx) => {
    if (group.length > 1) {
      lines.push(`   Group ${idx + 1}: [${group.map(a => `"${a}"`).join(", ")}]`);
    }
  });

  lines.push("\n🎯 GROUND TRUTH GROUPS:");
  comparison.groundTruthGroups.forEach((group, idx) => {
    if (group.length > 1) {
      lines.push(`   Group ${idx + 1}: [${group.map(a => `"${a}"`).join(", ")}]`);
    }
  });

  return lines.join("\n");
}
