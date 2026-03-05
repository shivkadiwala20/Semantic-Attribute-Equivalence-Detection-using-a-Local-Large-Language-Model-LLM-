// import fs from "fs";
// import csv from "csv-parser";
// import axios from "axios";

// // Step 1: Read CSV attributes
// function getAttributesFromCSV(filePath) {
//   return new Promise((resolve, reject) => {
//     const attributes = [];

//     fs.createReadStream(filePath)
//       .pipe(csv())
//       .on("headers", (headers) => {
//         resolve(headers);
//       })
//       .on("error", (err) => reject(err));
//   });
// }

// // Step 2: Ask LLM to group equivalent attributes
// async function askLLM(attributes) {
//   const prompt = `
// Group the following attribute names that have the same meaning.

// Attributes:
// ${JSON.stringify(attributes)}

// Output ONLY JSON in this structure:
// {
//   "group1": ["attrA", "attrB"],
//   "group2": ["attrC", "attrD"]
// }
//   `;

//   const response = await axios.post("http://localhost:11434/api/generate", {
//     model: "qwen3:1.7b",
//     prompt: prompt,
//     stream: false,
//   });

//   // FIX: actual text is in response.data.response
//   return response.data.response;
// }

// // Step 3: Main process
// async function main() {
//   console.log("Reading attributes...");
//   const attributes = await getAttributesFromCSV("sample.csv");

//   console.log("Attributes found:", attributes);

//   console.log("\nAsking LLM...");
//   const llmResponse = await askLLM(attributes);

//   console.log("\n=== LLM Output ===");
//   console.log(llmResponse);
// }

// main();

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
import { evaluate, compareWithGroundTruth, formatComparison } from "./evaluate.js";

const datasetPath = process.argv[2];

if (!datasetPath) {
  console.error("Usage: node src/index.js datasets/sample.csv");
  process.exit(1);
}

const datasetName = path.basename(datasetPath).split(".")[0];

async function run() {
  console.log("=".repeat(60));
  console.log(`Evaluating dataset: ${datasetName}`);
  console.log("=".repeat(60));

  // Step 1: Extract attributes
  console.log("\n[1/6] Reading dataset...");
  const attributes = await extractAttributesFromCSV(datasetPath);
  console.log(`Found ${attributes.length} attributes: ${attributes.join(", ")}`);

  // Step 2: Normalize attributes
  console.log("\n[2/6] Normalizing attributes...");
  const normalized = normalizeAttributes(attributes);
  console.log(`Normalized: ${normalized.join(", ")}`);

  // Step 3: Load ground truth
  console.log("\n[3/6] Loading ground truth...");
  const groundTruth = JSON.parse(
    fs.readFileSync(`ground_truth/${datasetName}.truth.json`)
  );

  // Step 4: Run all LLM configurations
  console.log("\n[4/6] Running LLM configurations...");
  
  let basicResult, structuredResult, contextAwareResult;
  
  try {
    console.log("  - Basic prompt...");
    basicResult = await groupWithLLMBasic(normalized);
    // Ensure result has groups array
    if (!basicResult || !basicResult.groups || !Array.isArray(basicResult.groups)) {
      console.warn("    ⚠ Basic prompt returned invalid format, using empty groups");
      basicResult = { groups: [] };
    }
  } catch (err) {
    console.error("  ✗ Basic prompt failed:", err.message);
    basicResult = { groups: [] };
  }

  try {
    console.log("  - Structured prompt...");
    structuredResult = await groupWithLLMStructured(normalized);
    // Ensure result has groups array
    if (!structuredResult || !structuredResult.groups || !Array.isArray(structuredResult.groups)) {
      console.warn("    ⚠ Structured prompt returned invalid format, using empty groups");
      structuredResult = { groups: [] };
    }
  } catch (err) {
    console.error("  ✗ Structured prompt failed:", err.message);
    structuredResult = { groups: [] };
  }

  try {
    console.log("  - Context-aware prompt...");
    contextAwareResult = await groupWithLLMContextAware(normalized);
    // Ensure result has groups array
    if (!contextAwareResult || !contextAwareResult.groups || !Array.isArray(contextAwareResult.groups)) {
      console.warn("    ⚠ Context-aware prompt returned invalid format, using empty groups");
      contextAwareResult = { groups: [] };
    }
  } catch (err) {
    console.error("  ✗ Context-aware prompt failed:", err.message);
    contextAwareResult = { groups: [] };
  }

  // Step 5: Run baseline
  console.log("\n[5/6] Running baseline (edit distance)...");
  const baselineResult = baselineGrouping(normalized);

  // Step 6: Evaluate all configurations
  console.log("\n[6/6] Evaluating results...");
  
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
  fs.writeFileSync(
    `outputs/llm.basic.${datasetName}.json`,
    JSON.stringify(basicResult, null, 2)
  );
  fs.writeFileSync(
    `outputs/llm.structured.${datasetName}.json`,
    JSON.stringify(structuredResult, null, 2)
  );
  fs.writeFileSync(
    `outputs/llm.contextaware.${datasetName}.json`,
    JSON.stringify(contextAwareResult, null, 2)
  );
  fs.writeFileSync(
    `outputs/baseline.${datasetName}.json`,
    JSON.stringify(baselineResult, null, 2)
  );

  // Save comprehensive metrics with detailed comparisons
  const allMetrics = {
    basic: basicMetrics,
    structured: structuredMetrics,
    contextAware: contextAwareMetrics,
    baseline: baselineMetrics,
    comparisons: {
      basic: basicComparison,
      structured: structuredComparison,
      contextAware: contextAwareComparison,
      baseline: baselineComparison,
    },
  };

  fs.writeFileSync(
    `outputs/metrics.${datasetName}.json`,
    JSON.stringify(allMetrics, null, 2)
  );

  // Display summary table  
  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY: Comparison with Ground Truth");
  console.log("=".repeat(70));
  console.log("\nConfiguration              | Precision | Recall   | F1      | TP | FP | FN");
  console.log("-".repeat(70));
  console.log(
    `LLM (basic prompt)         | ${basicMetrics.precision.toFixed(2).padStart(8)} | ${basicMetrics.recall.toFixed(2).padStart(8)} | ${basicMetrics.f1.toFixed(2).padStart(7)} | ${basicMetrics.tp.toString().padStart(2)} | ${basicMetrics.fp.toString().padStart(2)} | ${basicMetrics.fn.toString().padStart(2)}`
  );
  console.log(
    `LLM (structured prompt)     | ${structuredMetrics.precision.toFixed(2).padStart(8)} | ${structuredMetrics.recall.toFixed(2).padStart(8)} | ${structuredMetrics.f1.toFixed(2).padStart(7)} | ${structuredMetrics.tp.toString().padStart(2)} | ${structuredMetrics.fp.toString().padStart(2)} | ${structuredMetrics.fn.toString().padStart(2)}`
  );
  console.log(
    `LLM (context-aware prompt)  | ${contextAwareMetrics.precision.toFixed(2).padStart(8)} | ${contextAwareMetrics.recall.toFixed(2).padStart(8)} | ${contextAwareMetrics.f1.toFixed(2).padStart(7)} | ${contextAwareMetrics.tp.toString().padStart(2)} | ${contextAwareMetrics.fp.toString().padStart(2)} | ${contextAwareMetrics.fn.toString().padStart(2)}`
  );
  console.log(
    `Baseline (edit distance)    | ${baselineMetrics.precision.toFixed(2).padStart(8)} | ${baselineMetrics.recall.toFixed(2).padStart(8)} | ${baselineMetrics.f1.toFixed(2).padStart(7)} | ${baselineMetrics.tp.toString().padStart(2)} | ${baselineMetrics.fp.toString().padStart(2)} | ${baselineMetrics.fn.toString().padStart(2)}`
  );
  console.log("=".repeat(70));
  console.log("TP = True Positives (correct pairs), FP = False Positives (incorrect pairs), FN = False Negatives (missed pairs)");

  // Display detailed comparisons
  console.log("\n" + "=".repeat(70));
  console.log("🔍 DETAILED COMPARISONS WITH GROUND TRUTH");
  console.log("=".repeat(70));

  // Show ground truth first for reference
  console.log("\n📌 GROUND TRUTH (Reference):");
  groundTruth.groups.forEach((group, idx) => {
    if (group.length > 1) {
      console.log(`   Group ${idx + 1}: [${group.map(a => `"${a}"`).join(", ")}]`);
    }
  });

  // Show best performing method first (highest F1)
  const comparisons = [
    structuredComparison,
    contextAwareComparison,
    baselineComparison,
    basicComparison,
  ].sort((a, b) => b.metrics.f1 - a.metrics.f1);

  console.log("\n" + "=".repeat(70));
  console.log("🏆 BEST PERFORMING METHOD:");
  console.log(formatComparison(comparisons[0]));

  // Show all other methods
  for (let i = 1; i < comparisons.length; i++) {
    console.log(formatComparison(comparisons[i]));
  }

  // Analysis: Why LLM is better than baseline
  console.log("\n" + "=".repeat(70));
  console.log("💡 ANALYSIS: LLM vs Baseline");
  console.log("=".repeat(70));

  const bestLLM = [structuredComparison, contextAwareComparison, basicComparison]
    .sort((a, b) => b.metrics.f1 - a.metrics.f1)[0];

  if (bestLLM.metrics.f1 > baselineComparison.metrics.f1) {
    console.log(`\n✅ LLM (${bestLLM.method}) outperforms Baseline:`);
    console.log(`   • F1-Score: ${bestLLM.metrics.f1.toFixed(3)} vs ${baselineComparison.metrics.f1.toFixed(3)} (${((bestLLM.metrics.f1 - baselineComparison.metrics.f1) * 100).toFixed(1)}% improvement)`);
    
    if (bestLLM.metrics.precision > baselineComparison.metrics.precision) {
      console.log(`   • Better Precision: ${bestLLM.metrics.precision.toFixed(3)} vs ${baselineComparison.metrics.precision.toFixed(3)}`);
      console.log(`     → LLM makes fewer incorrect groupings`);
    }
    
    if (bestLLM.metrics.recall > baselineComparison.metrics.recall) {
      console.log(`   • Better Recall: ${bestLLM.metrics.recall.toFixed(3)} vs ${baselineComparison.metrics.recall.toFixed(3)}`);
      console.log(`     → LLM finds more correct semantic equivalences`);
    }

    // Show examples where LLM succeeded but baseline failed
    const llmCorrectPairs = new Set(bestLLM.correctGroupings.map(p => `${p[0]}|${p[1]}`));
    const baselineCorrectPairs = new Set(baselineComparison.correctGroupings.map(p => `${p[0]}|${p[1]}`));
    const llmOnlyPairs = bestLLM.correctGroupings.filter(p => 
      !baselineCorrectPairs.has(`${p[0]}|${p[1]}`) && !baselineCorrectPairs.has(`${p[1]}|${p[0]}`)
    );

    if (llmOnlyPairs.length > 0) {
      console.log(`\n   🎯 Examples where LLM found semantic equivalence but Baseline missed:`);
      llmOnlyPairs.slice(0, 5).forEach((pair, idx) => {
        console.log(`      ${idx + 1}. "${pair[0]}" ↔ "${pair[1]}" (semantic match, not just spelling)`);
      });
    }
  } else {
    console.log(`\n⚠️  Baseline performs similarly or better in this case.`);
  }
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
