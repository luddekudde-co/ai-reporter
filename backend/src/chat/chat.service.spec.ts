// backend/src/chat/chat.service.spec.ts
import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test reply' } }],
        }),
      },
    },
  })),
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenAI = require('openai').default as jest.Mock;
    OpenAI.mockImplementationOnce(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({ choices: [] }),
        },
      },
    }));
    const module = await Test.createTestingModule({
      providers: [ChatService],
    }).compile();
    const svc = module.get(ChatService);
    const reply = await svc.chat('T', 'S', 'Src', []);
    expect(reply).toBe('');
  });
});
