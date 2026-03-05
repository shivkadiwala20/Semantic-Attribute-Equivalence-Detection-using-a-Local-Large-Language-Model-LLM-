import fs from "fs";
import path from "path";
import { extractAttributesFromCSV } from "./extract.js";
import { normalizeAttributes } from "./normalize.js";
import {
  groupWithLLMBasic,
  groupWithLLMStructured,
  groupWithLLMContextAware,
} from "./llm.js";
import { baselineGrouping } from "./baseline.js";
import { evaluate, compareWithGroundTruth } from "./evaluate.js";

/**
 * Batch evaluation script for multiple datasets
 * Usage: node src/batch-evaluate.js [dataset1.csv] [dataset2.csv] ...
 * Or: node src/batch-evaluate.js (processes all CSV files in datasets/)
 */

async function evaluateDataset(datasetPath) {
  const datasetName = path.basename(datasetPath).split(".")[0];
  const startTime = Date.now();

  console.log("\n" + "=".repeat(70));
  console.log(`📊 Evaluating: ${datasetName}`);
  console.log("=".repeat(70));

  try {
    // Step 1: Extract attributes
    console.log("\n[1/6] Reading dataset...");
    const attributes = await extractAttributesFromCSV(datasetPath);
    console.log(`   ✓ Found ${attributes.length} attributes`);

    if (attributes.length === 0) {
      throw new Error("No attributes found in dataset");
    }

    // Step 2: Normalize attributes
    console.log("[2/6] Normalizing attributes...");
    const normalized = normalizeAttributes(attributes);

    // Step 3: Load ground truth
    console.log("[3/6] Loading ground truth...");
    const groundTruthPath = `ground_truth/${datasetName}.truth.json`;
    if (!fs.existsSync(groundTruthPath)) {
      throw new Error(
        `Ground truth file not found: ${groundTruthPath}\n` +
          `Please create it first using: node src/create-ground-truth.js ${datasetPath}`
      );
    }
    const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath));

    // Step 4: Run all LLM configurations
    console.log("[4/6] Running LLM configurations...");

    let basicResult, structuredResult, contextAwareResult;
    let basicTime = 0,
      structuredTime = 0,
      contextAwareTime = 0;

    try {
      const start = Date.now();
      console.log("   - Basic prompt...");
      basicResult = await groupWithLLMBasic(normalized);
      // Ensure result has groups array
      if (!basicResult || !basicResult.groups || !Array.isArray(basicResult.groups)) {
        console.warn("     ⚠ Basic prompt returned invalid format, using empty groups");
        basicResult = { groups: [] };
      }
      basicTime = Date.now() - start;
      console.log(`     ✓ Completed in ${basicTime}ms`);
    } catch (err) {
      console.error(`     ✗ Failed: ${err.message}`);
      basicResult = { groups: [] };
    }

    try {
      const start = Date.now();
      console.log("   - Structured prompt...");
      structuredResult = await groupWithLLMStructured(normalized);
      // Ensure result has groups array
      if (!structuredResult || !structuredResult.groups || !Array.isArray(structuredResult.groups)) {
        console.warn("     ⚠ Structured prompt returned invalid format, using empty groups");
        structuredResult = { groups: [] };
      }
      structuredTime = Date.now() - start;
      console.log(`     ✓ Completed in ${structuredTime}ms`);
    } catch (err) {
      console.error(`     ✗ Failed: ${err.message}`);
      structuredResult = { groups: [] };
    }

    try {
      const start = Date.now();
      console.log("   - Context-aware prompt...");
      contextAwareResult = await groupWithLLMContextAware(normalized);
      // Ensure result has groups array
      if (!contextAwareResult || !contextAwareResult.groups || !Array.isArray(contextAwareResult.groups)) {
        console.warn("     ⚠ Context-aware prompt returned invalid format, using empty groups");
        contextAwareResult = { groups: [] };
      }
      contextAwareTime = Date.now() - start;
      console.log(`     ✓ Completed in ${contextAwareTime}ms`);
    } catch (err) {
      console.error(`     ✗ Failed: ${err.message}`);
      contextAwareResult = { groups: [] };
    }

    // Step 5: Run baseline
    console.log("[5/6] Running baseline (edit distance)...");
    const baselineStart = Date.now();
    const baselineResult = baselineGrouping(normalized);
    const baselineTime = Date.now() - baselineStart;
    console.log(`   ✓ Completed in ${baselineTime}ms`);

    // Step 6: Evaluate all configurations
    console.log("[6/6] Evaluating results...");

    const basicMetrics = evaluate(basicResult, groundTruth);
    const structuredMetrics = evaluate(structuredResult, groundTruth);
    const contextAwareMetrics = evaluate(contextAwareResult, groundTruth);
    const baselineMetrics = evaluate(baselineResult, groundTruth);

    // Detailed comparisons with ground truth
    const basicComparison = compareWithGroundTruth(basicResult, groundTruth, "LLM (Basic Prompt)");
    const structuredComparison = compareWithGroundTruth(structuredResult, groundTruth, "LLM (Structured Prompt)");
    const contextAwareComparison = compareWithGroundTruth(contextAwareResult, groundTruth, "LLM (Context-Aware Prompt)");
    const baselineComparison = compareWithGroundTruth(baselineResult, groundTruth, "Baseline (Edit Distance)");

    // Save individual results
    const outputDir = "outputs";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      `${outputDir}/llm.basic.${datasetName}.json`,
      JSON.stringify(basicResult, null, 2)
    );
    fs.writeFileSync(
      `${outputDir}/llm.structured.${datasetName}.json`,
      JSON.stringify(structuredResult, null, 2)
    );
    fs.writeFileSync(
      `${outputDir}/llm.contextaware.${datasetName}.json`,
      JSON.stringify(contextAwareResult, null, 2)
    );
    fs.writeFileSync(
      `${outputDir}/baseline.${datasetName}.json`,
      JSON.stringify(baselineResult, null, 2)
    );

    // Save comprehensive metrics with timing and detailed comparisons
    const allMetrics = {
      dataset: datasetName,
      attributeCount: attributes.length,
      timing: {
        basic: basicTime,
        structured: structuredTime,
        contextAware: contextAwareTime,
        baseline: baselineTime,
        total: Date.now() - startTime,
      },
      metrics: {
        basic: basicMetrics,
        structured: structuredMetrics,
        contextAware: contextAwareMetrics,
        baseline: baselineMetrics,
      },
      comparisons: {
        basic: basicComparison,
        structured: structuredComparison,
        contextAware: contextAwareComparison,
        baseline: baselineComparison,
      },
    };

    fs.writeFileSync(
      `${outputDir}/metrics.${datasetName}.json`,
      JSON.stringify(allMetrics, null, 2)
    );

    // Display results table with ground truth comparison
    console.log("\n" + "=".repeat(70));
    console.log("📊 RESULTS: Comparison with Ground Truth");
    console.log("=".repeat(70));
    console.log(
      "\nConfiguration              | Precision | Recall   | F1      | TP | FP | FN | Time (ms)"
    );
    console.log("-".repeat(70));
    console.log(
      `LLM (basic prompt)         | ${basicMetrics.precision.toFixed(2).padStart(8)} | ${basicMetrics.recall.toFixed(2).padStart(8)} | ${basicMetrics.f1.toFixed(2).padStart(7)} | ${basicMetrics.tp.toString().padStart(2)} | ${basicMetrics.fp.toString().padStart(2)} | ${basicMetrics.fn.toString().padStart(2)} | ${basicTime.toString().padStart(9)}`
    );
    console.log(
      `LLM (structured prompt)     | ${structuredMetrics.precision.toFixed(2).padStart(8)} | ${structuredMetrics.recall.toFixed(2).padStart(8)} | ${structuredMetrics.f1.toFixed(2).padStart(7)} | ${structuredMetrics.tp.toString().padStart(2)} | ${structuredMetrics.fp.toString().padStart(2)} | ${structuredMetrics.fn.toString().padStart(2)} | ${structuredTime.toString().padStart(9)}`
    );
    console.log(
      `LLM (context-aware prompt)  | ${contextAwareMetrics.precision.toFixed(2).padStart(8)} | ${contextAwareMetrics.recall.toFixed(2).padStart(8)} | ${contextAwareMetrics.f1.toFixed(2).padStart(7)} | ${contextAwareMetrics.tp.toString().padStart(2)} | ${contextAwareMetrics.fp.toString().padStart(2)} | ${contextAwareMetrics.fn.toString().padStart(2)} | ${contextAwareTime.toString().padStart(9)}`
    );
    console.log(
      `Baseline (edit distance)    | ${baselineMetrics.precision.toFixed(2).padStart(8)} | ${baselineMetrics.recall.toFixed(2).padStart(8)} | ${baselineMetrics.f1.toFixed(2).padStart(7)} | ${baselineMetrics.tp.toString().padStart(2)} | ${baselineMetrics.fp.toString().padStart(2)} | ${baselineMetrics.fn.toString().padStart(2)} | ${baselineTime.toString().padStart(9)}`
    );
    console.log("=".repeat(70));
    console.log("TP = True Positives, FP = False Positives, FN = False Negatives");
    console.log(`Total time: ${allMetrics.timing.total}ms`);

    // Show key comparison insights
    const bestLLM = [structuredComparison, contextAwareComparison, basicComparison]
      .sort((a, b) => b.metrics.f1 - a.metrics.f1)[0];

    if (bestLLM.metrics.f1 > baselineComparison.metrics.f1) {
      const improvement = ((bestLLM.metrics.f1 - baselineComparison.metrics.f1) * 100).toFixed(1);
      console.log(`\n✅ Best LLM (${bestLLM.method}) outperforms Baseline by ${improvement}% F1-Score`);
      console.log(`   • Found ${bestLLM.metrics.truePositives} correct pairs vs ${baselineComparison.metrics.truePositives} for baseline`);
      console.log(`   • Made ${bestLLM.metrics.falsePositives} incorrect groupings vs ${baselineComparison.metrics.falsePositives} for baseline`);
      console.log(`   • Missed ${bestLLM.metrics.falseNegatives} pairs vs ${baselineComparison.metrics.falseNegatives} for baseline`);
    }

    return allMetrics;
  } catch (err) {
    console.error(`\n❌ Error evaluating ${datasetName}:`, err.message);
    return null;
  }
}

async function main() {
  const datasetsDir = "datasets";
  let datasetPaths = [];

  // Get dataset paths from command line arguments or scan datasets directory
  if (process.argv.length > 2) {
    datasetPaths = process.argv.slice(2);
  } else {
    // Process all CSV files in datasets directory
    if (fs.existsSync(datasetsDir)) {
      const files = fs.readdirSync(datasetsDir);
      datasetPaths = files
        .filter((file) => file.endsWith(".csv"))
        .map((file) => path.join(datasetsDir, file));
    } else {
      console.error("No datasets directory found and no files specified.");
      console.error("Usage: node src/batch-evaluate.js [dataset1.csv] [dataset2.csv] ...");
      process.exit(1);
    }
  }

  if (datasetPaths.length === 0) {
    console.error("No datasets to process.");
    process.exit(1);
  }

  console.log("🚀 Starting batch evaluation");
  console.log(`📁 Processing ${datasetPaths.length} dataset(s)\n`);

  const allResults = [];
  const overallStart = Date.now();

  for (let i = 0; i < datasetPaths.length; i++) {
    const datasetPath = datasetPaths[i];
    console.log(`\n[${i + 1}/${datasetPaths.length}] Processing: ${datasetPath}`);
    
    if (!fs.existsSync(datasetPath)) {
      console.error(`   ✗ File not found: ${datasetPath}`);
      continue;
    }

    const result = await evaluateDataset(datasetPath);
    if (result) {
      allResults.push(result);
    }

    // Add a small delay between datasets to avoid overwhelming the LLM API
    if (i < datasetPaths.length - 1) {
      console.log("\n⏳ Waiting 2 seconds before next dataset...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Generate summary report
  if (allResults.length > 0) {
    console.log("\n\n" + "=".repeat(70));
    console.log("📈 SUMMARY REPORT");
    console.log("=".repeat(70));

    // Calculate averages
    const avgMetrics = {
      basic: { precision: 0, recall: 0, f1: 0 },
      structured: { precision: 0, recall: 0, f1: 0 },
      contextAware: { precision: 0, recall: 0, f1: 0 },
      baseline: { precision: 0, recall: 0, f1: 0 },
    };

    allResults.forEach((result) => {
      avgMetrics.basic.precision += result.metrics.basic.precision;
      avgMetrics.basic.recall += result.metrics.basic.recall;
      avgMetrics.basic.f1 += result.metrics.basic.f1;
      avgMetrics.structured.precision += result.metrics.structured.precision;
      avgMetrics.structured.recall += result.metrics.structured.recall;
      avgMetrics.structured.f1 += result.metrics.structured.f1;
      avgMetrics.contextAware.precision += result.metrics.contextAware.precision;
      avgMetrics.contextAware.recall += result.metrics.contextAware.recall;
      avgMetrics.contextAware.f1 += result.metrics.contextAware.f1;
      avgMetrics.baseline.precision += result.metrics.baseline.precision;
      avgMetrics.baseline.recall += result.metrics.baseline.recall;
      avgMetrics.baseline.f1 += result.metrics.baseline.f1;
    });

    const count = allResults.length;
    Object.keys(avgMetrics).forEach((key) => {
      avgMetrics[key].precision /= count;
      avgMetrics[key].recall /= count;
      avgMetrics[key].f1 /= count;
    });

    console.log("\nAverage Performance Across All Datasets:");
    console.log(
      "\nConfiguration              | Precision | Recall   | F1"
    );
    console.log("-".repeat(70));
    console.log(
      `LLM (basic prompt)         | ${avgMetrics.basic.precision.toFixed(2).padStart(8)} | ${avgMetrics.basic.recall.toFixed(2).padStart(8)} | ${avgMetrics.basic.f1.toFixed(2)}`
    );
    console.log(
      `LLM (structured prompt)     | ${avgMetrics.structured.precision.toFixed(2).padStart(8)} | ${avgMetrics.structured.recall.toFixed(2).padStart(8)} | ${avgMetrics.structured.f1.toFixed(2)}`
    );
    console.log(
      `LLM (context-aware prompt)  | ${avgMetrics.contextAware.precision.toFixed(2).padStart(8)} | ${avgMetrics.contextAware.recall.toFixed(2).padStart(8)} | ${avgMetrics.contextAware.f1.toFixed(2)}`
    );
    console.log(
      `Baseline (edit distance)    | ${avgMetrics.baseline.precision.toFixed(2).padStart(8)} | ${avgMetrics.baseline.recall.toFixed(2).padStart(8)} | ${avgMetrics.baseline.f1.toFixed(2)}`
    );
    console.log("=".repeat(70));

    // Save summary
    const summary = {
      totalDatasets: allResults.length,
      overallTime: Date.now() - overallStart,
      averageMetrics: avgMetrics,
      datasets: allResults,
    };

    fs.writeFileSync(
      "outputs/summary.json",
      JSON.stringify(summary, null, 2)
    );
    console.log("\n✓ Summary saved to outputs/summary.json");
  }

  console.log(`\n✅ Batch evaluation completed in ${Date.now() - overallStart}ms`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
