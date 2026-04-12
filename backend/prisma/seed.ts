import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.article.createMany({
    data: [
      {
        title: 'OpenAI releases GPT-5',
        url: 'https://example.com/gpt-5',
        summary: 'OpenAI announced GPT-5 with major reasoning improvements.',
        source: 'TechCrunch',
        publishedAt: new Date('2025-01-01'),
      },
      {
        title: 'Google DeepMind achieves AGI milestone',
        url: 'https://example.com/deepmind-agi',
        summary: null,
        source: 'The Verge',
        publishedAt: new Date('2025-01-02'),
      },
      {
        title: 'Anthropic raises $5B in new funding',
        url: 'https://example.com/anthropic-funding',
        summary: 'Anthropic secures $5B to accelerate AI safety research.',
        source: 'Bloomberg',
        publishedAt: new Date('2025-01-03'),
      },
    ],
    skipDuplicates: true,
  });
  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
