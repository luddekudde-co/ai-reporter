export const digestPrompt = (
  articles: { title: string; summary: string | null }[],
) => {
  const articleList = articles
    .map((a, i) => `${i + 1}. ${a.title}\n   ${a.summary ?? '(no summary)'}`)
    .join('\n\n');

  return `You are an AI news editor writing a weekly digest for a tech-savvy audience.

Given the top AI news stories from this week listed below, write a concise 2-3 sentence paragraph summarising the key themes and most important developments. Write in a clear, journalistic tone. Do not list the articles — synthesise the themes.

Articles:
${articleList}

Respond with only the summary paragraph, no headers or extra text.`;
};
