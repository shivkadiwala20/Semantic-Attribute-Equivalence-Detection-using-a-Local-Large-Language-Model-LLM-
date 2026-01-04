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
import { groupWithLLM } from "./llm.js";
import { baselineGrouping } from "./baseline.js";
import { evaluate } from "./evaluate.js";

const datasetPath = process.argv[2];

if (!datasetPath) {
  console.error("Usage: node src/index.js datasets/sample.csv");
  process.exit(1);
}

const datasetName = path.basename(datasetPath).split(".")[0];

async function run() {
  console.log("Reading dataset...");
  const attributes = await extractAttributesFromCSV(datasetPath);

  console.log("Normalizing attributes...");
  const normalized = normalizeAttributes(attributes);

  console.log("Running LLM grouping...");
  const llmResult = await groupWithLLM(normalized);

  console.log("Running baseline grouping...");
  const baselineResult = baselineGrouping(normalized);

  console.log("Loading ground truth...");
  const groundTruth = JSON.parse(
    fs.readFileSync(`ground_truth/${datasetName}.truth.json`)
  );

  console.log("Evaluating...");
  const llmMetrics = evaluate(llmResult, groundTruth);
  const baselineMetrics = evaluate(baselineResult, groundTruth);

  fs.writeFileSync(
    `outputs/llm.${datasetName}.json`,
    JSON.stringify(llmResult, null, 2)
  );
  fs.writeFileSync(
    `outputs/baseline.${datasetName}.json`,
    JSON.stringify(baselineResult, null, 2)
  );
  fs.writeFileSync(
    `outputs/metrics.${datasetName}.json`,
    JSON.stringify({ llmMetrics, baselineMetrics }, null, 2)
  );

  console.log("LLM Metrics:", llmMetrics);
  console.log("Baseline Metrics:", baselineMetrics);
}

run();
