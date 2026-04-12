export interface FeedConfig {
  url: string;
  source: string;
}

export const RSS_FEEDS: FeedConfig[] = [
  {
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    source: 'TechCrunch',
  },
  {
    url: 'https://venturebeat.com/category/ai/feed/',
    source: 'VentureBeat',
  },
  {
    url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    source: 'The Verge',
  },
  {
    url: 'https://feeds.feedburner.com/mit-tech-review/latest',
    source: 'MIT Technology Review',
  },
  {
    url: 'https://openai.com/blog/rss.xml',
    source: 'OpenAI',
  },
];
