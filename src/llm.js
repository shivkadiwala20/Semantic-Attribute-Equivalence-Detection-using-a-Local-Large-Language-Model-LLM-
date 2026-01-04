import axios from "axios";

export async function groupWithLLM(attributes) {
  const prompt = `
Group the following attribute names by semantic meaning.

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
${attributes.join(", ")}
`;

  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "qwen3:1.7b",
    prompt,
    stream: false,
  });

  try {
    return JSON.parse(response.data.response);
  } catch (err) {
    console.error("Raw LLM output:", response.data.response);
    throw new Error("Invalid JSON returned by LLM");
  }
}
