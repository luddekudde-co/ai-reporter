import { Test } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../prisma/prisma.service';

const mockTransaction = jest.fn();
const mockPrisma = {
  $transaction: mockTransaction,
  digestArticle: { deleteMany: jest.fn() },
  article: { deleteMany: jest.fn() },
};

describe('CleanupService', () => {
  let service: CleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (fn) => fn(mockPrisma));

    const module = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CleanupService);
  });

  it('deletes DigestArticle rows before Article rows', async () => {
    const deleteOrder: string[] = [];
    mockPrisma.digestArticle.deleteMany.mockImplementation(async () => {
      deleteOrder.push('digestArticle');
      return { count: 2 };
    });
    mockPrisma.article.deleteMany.mockImplementation(async () => {
      deleteOrder.push('article');
      return { count: 5 };
    });

    await service.deleteOldArticles();

    expect(deleteOrder).toEqual(['digestArticle', 'article']);
  });

  it('uses publishedAt older than 4 months as cutoff', async () => {
    mockPrisma.digestArticle.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.article.deleteMany.mockResolvedValue({ count: 0 });

    const before = new Date();
    await service.deleteOldArticles();
    const after = new Date();

    const articleCall = mockPrisma.article.deleteMany.mock.calls[0][0];
    const cutoff: Date = articleCall.where.publishedAt.lt;

    const fourMonthsBefore = new Date(before);
    fourMonthsBefore.setMonth(fourMonthsBefore.getMonth() - 4);
    const fourMonthsAfter = new Date(after);
    fourMonthsAfter.setMonth(fourMonthsAfter.getMonth() - 4);

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(fourMonthsBefore.getTime());
    expect(cutoff.getTime()).toBeLessThanOrEqual(fourMonthsAfter.getTime());
  });

  it('passes matching cutoff to digestArticle delete', async () => {
    mockPrisma.digestArticle.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.article.deleteMany.mockResolvedValue({ count: 0 });

    await service.deleteOldArticles();

    const digestCall = mockPrisma.digestArticle.deleteMany.mock.calls[0][0];
    expect(digestCall.where.article.publishedAt.lt).toBeInstanceOf(Date);
  });
});
