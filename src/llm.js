import axios from "axios";

/**
 * Basic prompt - simple instruction without structured format
 */
export function createBasicPrompt(attributes) {
  return `Group the following attribute names that have the same meaning.

Attributes: ${attributes.join(", ")}

Output the groups in JSON format.`;
}

/**
 * Structured prompt - explicit JSON format requirements
 */
export function createStructuredPrompt(attributes) {
  return `Group the following attribute names by semantic meaning.

Rules:
- Output ONLY valid JSON
- No explanations
- Use this format:

{
  "groups": [
    ["attr1", "attr2"],
    ["attr3", "attr4"]
  ]
}

Attributes:
${attributes.join(", ")}`;
}

/**
 * Context-aware prompt - enhanced for multilingual support
 */
export function createContextAwarePrompt(attributes) {
  return `You are analyzing attribute names from heterogeneous datasets that may contain multiple languages (English, German, etc.).

Task: Group attribute names that have the same semantic meaning, regardless of language or naming convention.

Examples of equivalent attributes:
- "firstname", "fname", "vorname", "givenName" → same meaning
- "birthdate", "dob", "date_of_birth", "geburtsdatum" → same meaning
- "city", "stadt", "cityname", "location" → same meaning

Rules:
- Consider semantic equivalence across languages
- Group attributes that represent the same concept
- Output ONLY valid JSON
- Use this exact format:

{
  "groups": [
    ["attr1", "attr2"],
    ["attr3", "attr4"]
  ]
}

Attributes to analyze:
${attributes.map((attr, idx) => `${idx + 1}. ${attr}`).join("\n")}

Output the grouped attributes in JSON format:`;
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
    // Try to extract JSON from response if it's wrapped in markdown or text
    let jsonStr = rawResponse;
    
    // Remove markdown code blocks if present
    if (rawResponse.includes("```json")) {
      jsonStr = rawResponse.split("```json")[1].split("```")[0].trim();
    } else if (rawResponse.includes("```")) {
      jsonStr = rawResponse.split("```")[1].split("```")[0].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Ensure the result has the expected structure
    if (!parsed.groups || !Array.isArray(parsed.groups)) {
      // Try to convert other formats to groups array
      if (Array.isArray(parsed)) {
        // If it's already an array of groups
        return { groups: parsed };
      } else if (typeof parsed === 'object') {
        // Try to extract groups from object keys
        const groups = [];
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            groups.push(parsed[key]);
          }
        }
        if (groups.length > 0) {
          return { groups };
        }
      }
      // If we can't parse it, return empty groups
      console.warn("LLM returned unexpected format, using empty groups");
      return { groups: [] };
    }
    
    return parsed;
  } catch (err) {
    console.error("Raw LLM output:", response.data.response);
    throw new Error(`Invalid JSON returned by LLM: ${err.message}`);
  }
}

/**
 * Group attributes using basic prompt
 */
export async function groupWithLLMBasic(attributes) {
  const prompt = createBasicPrompt(attributes);
  return await callLLM(prompt);
}

/**
 * Group attributes using structured prompt
 */
export async function groupWithLLMStructured(attributes) {
  const prompt = createStructuredPrompt(attributes);
  return await callLLM(prompt);
}

/**
 * Group attributes using context-aware prompt
 */
export async function groupWithLLMContextAware(attributes) {
  const prompt = createContextAwarePrompt(attributes);
  return await callLLM(prompt);
}

/**
 * Legacy function for backward compatibility
 */
export async function groupWithLLM(attributes) {
  return await groupWithLLMStructured(attributes);
}
