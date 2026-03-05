import axios from "axios";
import {
  createBasicPrompt,
  createStructuredPrompt,
  createContextAwarePrompt,
  groupWithLLMBasic,
  groupWithLLMStructured,
  groupWithLLMContextAware,
} from "./llm.js";

/**
 * Chunked LLM processing for large attribute lists
 * Splits attributes into smaller chunks, processes each, then merges results
 */

const MAX_ATTRIBUTES_PER_CHUNK = 20; // Adjust based on your LLM's context window

/**
 * Split attributes into chunks
 */
function chunkAttributes(attributes, chunkSize = MAX_ATTRIBUTES_PER_CHUNK) {
  const chunks = [];
  for (let i = 0; i < attributes.length; i += chunkSize) {
    chunks.push(attributes.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Merge multiple grouping results into one
 */
function mergeGroupingResults(results) {
  const allGroups = [];
  const attributeToGroup = new Map();

  // Process each result
  results.forEach((result) => {
    if (!result.groups || !Array.isArray(result.groups)) {
      return;
    }

    result.groups.forEach((group) => {
      if (!Array.isArray(group) || group.length === 0) {
        return;
      }

      // Find if any attribute in this group is already in a merged group
      let mergedGroup = null;
      for (const attr of group) {
        if (attributeToGroup.has(attr)) {
          mergedGroup = attributeToGroup.get(attr);
          break;
        }
      }

      if (!mergedGroup) {
        // Create new merged group
        mergedGroup = [];
        allGroups.push(mergedGroup);
      }

      // Add all attributes from this group to the merged group
      group.forEach((attr) => {
        if (!mergedGroup.includes(attr)) {
          mergedGroup.push(attr);
          attributeToGroup.set(attr, mergedGroup);
        }
      });
    });
  });

  return { groups: allGroups };
}

/**
 * Call LLM with a specific prompt configuration
 */
async function callLLM(prompt, model = "qwen3:1.7b") {
  const response = await axios.post("http://localhost:11434/api/generate", {
    model,
    prompt,
    stream: false,
  });

  try {
    const rawResponse = response.data.response.trim();
    let jsonStr = rawResponse;

    // Remove markdown code blocks if present
    if (rawResponse.includes("```json")) {
      jsonStr = rawResponse.split("```json")[1].split("```")[0].trim();
    } else if (rawResponse.includes("```")) {
      jsonStr = rawResponse.split("```")[1].split("```")[0].trim();
    }

    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Raw LLM output:", response.data.response);
    throw new Error(`Invalid JSON returned by LLM: ${err.message}`);
  }
}

/**
 * Process attributes in chunks using basic prompt
 */
export async function groupWithLLMBasicChunked(attributes, chunkSize = MAX_ATTRIBUTES_PER_CHUNK) {
  if (attributes.length <= chunkSize) {
    // Small enough, use regular function
    return await groupWithLLMBasic(attributes);
  }

  console.log(`   Processing ${attributes.length} attributes in chunks of ${chunkSize}...`);
  const chunks = chunkAttributes(attributes, chunkSize);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} attributes)...`);
    const prompt = createBasicPrompt(chunks[i]);
    const result = await callLLM(prompt);
    results.push(result);
    
    // Small delay between chunks to avoid overwhelming the API
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return mergeGroupingResults(results);
}

/**
 * Process attributes in chunks using structured prompt
 */
export async function groupWithLLMStructuredChunked(attributes, chunkSize = MAX_ATTRIBUTES_PER_CHUNK) {
  if (attributes.length <= chunkSize) {
    return await groupWithLLMStructured(attributes);
  }

  console.log(`   Processing ${attributes.length} attributes in chunks of ${chunkSize}...`);
  const chunks = chunkAttributes(attributes, chunkSize);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} attributes)...`);
    const prompt = createStructuredPrompt(chunks[i]);
    const result = await callLLM(prompt);
    results.push(result);
    
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return mergeGroupingResults(results);
}

/**
 * Process attributes in chunks using context-aware prompt
 */
export async function groupWithLLMContextAwareChunked(attributes, chunkSize = MAX_ATTRIBUTES_PER_CHUNK) {
  if (attributes.length <= chunkSize) {
    return await groupWithLLMContextAware(attributes);
  }

  console.log(`   Processing ${attributes.length} attributes in chunks of ${chunkSize}...`);
  const chunks = chunkAttributes(attributes, chunkSize);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} attributes)...`);
    const prompt = createContextAwarePrompt(chunks[i]);
    const result = await callLLM(prompt);
    results.push(result);
    
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return mergeGroupingResults(results);
}
