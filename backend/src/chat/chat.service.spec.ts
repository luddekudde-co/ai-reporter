// backend/src/chat/chat.service.spec.ts
import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Test reply' } }],
    });
    const module = await Test.createTestingModule({
      providers: [ChatService],
    }).compile();
    service = module.get(ChatService);
  });

  it('returns the AI reply text', async () => {
    const reply = await service.chat('Title', 'Summary', 'Source', [
      { role: 'user', content: 'What is this about?' },
    ]);
    expect(reply).toBe('Test reply');
  });

  it('returns empty string when OpenAI returns no content', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });
    const reply = await service.chat('T', 'S', 'Src', []);
    expect(reply).toBe('');
  });
});
