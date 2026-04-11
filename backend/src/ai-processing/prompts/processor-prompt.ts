export const processorPrompt = (
  title: string,
  source: string,
  snippet?: string,
) => `You are an AI news analyst. Given the article title and raw snippet below, return a JSON object with exactly these fields:
- "summary": a clear 2-3 sentence summary of the article
- "category": a single short label for the topic (e.g. "LLMs", "Robotics", "Policy", "Research", "Funding", "Products", "Safety")
- "impactLevel": one of "LOW", "MEDIUM", or "HIGH" based on how significant this news is for the AI industry

Title: ${title}
Source: ${source}
Snippet: ${snippet ?? '(no snippet available)'}

Respond only with valid JSON.`;
