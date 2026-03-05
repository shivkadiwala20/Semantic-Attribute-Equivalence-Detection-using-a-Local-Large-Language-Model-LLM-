import fs from "fs";
import path from "path";
import { extractAttributesFromCSV } from "./extract.js";
import { normalizeAttributes } from "./normalize.js";

/**
 * Helper script to create ground truth files for new datasets
 * Usage: node src/create-ground-truth.js datasets/your-dataset.csv
 * 
 * This will:
 * 1. Extract attributes from the CSV
 * 2. Show you the attributes
 * 3. Create a template ground truth file
 * 4. You can then manually edit it to specify correct groupings
 */

const datasetPath = process.argv[2];

if (!datasetPath) {
  console.error("Usage: node src/create-ground-truth.js datasets/your-dataset.csv");
  process.exit(1);
}

if (!fs.existsSync(datasetPath)) {
  console.error(`Error: File not found: ${datasetPath}`);
  process.exit(1);
}

async function createGroundTruthTemplate() {
  const datasetName = path.basename(datasetPath).split(".")[0];
  const groundTruthDir = "ground_truth";
  const groundTruthPath = `${groundTruthDir}/${datasetName}.truth.json`;

  console.log("=".repeat(60));
  console.log("Creating Ground Truth Template");
  console.log("=".repeat(60));

  // Extract attributes
  console.log("\n[1/3] Extracting attributes from CSV...");
  const attributes = await extractAttributesFromCSV(datasetPath);
  console.log(`   ✓ Found ${attributes.length} attributes`);

  // Normalize attributes
  console.log("\n[2/3] Normalizing attributes...");
  const normalized = normalizeAttributes(attributes);

  console.log("\nAttributes found:");
  normalized.forEach((attr, idx) => {
    console.log(`   ${idx + 1}. ${attr}`);
  });

  // Check if ground truth already exists
  if (fs.existsSync(groundTruthPath)) {
    console.log(`\n⚠️  Ground truth file already exists: ${groundTruthPath}`);
    console.log("   It will be overwritten. Press Ctrl+C to cancel, or wait 3 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Create ground truth directory if it doesn't exist
  if (!fs.existsSync(groundTruthDir)) {
    fs.mkdirSync(groundTruthDir, { recursive: true });
  }

  // Create template with all attributes as separate groups
  // User should manually edit this to group equivalent attributes
  const template = {
    groups: normalized.map((attr) => [attr]), // Each attribute in its own group initially
  };

  console.log("\n[3/3] Creating ground truth template...");
  fs.writeFileSync(groundTruthPath, JSON.stringify(template, null, 2));
  console.log(`   ✓ Template created: ${groundTruthPath}`);

  console.log("\n" + "=".repeat(60));
  console.log("Next Steps:");
  console.log("=".repeat(60));
  console.log("\n1. Open the ground truth file:");
  console.log(`   ${groundTruthPath}`);
  console.log("\n2. Edit it to group equivalent attributes together.");
  console.log("   Example:");
  console.log('   {');
  console.log('     "groups": [');
  console.log('       ["fname", "firstname", "vorname"],');
  console.log('       ["lname", "lastname", "nachname"],');
  console.log('       ["cityname", "stadt"]');
  console.log('     ]');
  console.log('   }');
  console.log("\n3. Run evaluation:");
  console.log(`   node src/batch-evaluate.js ${datasetPath}`);
  console.log("\n" + "=".repeat(60));
}

createGroundTruthTemplate().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
