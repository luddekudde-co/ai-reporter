import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { chatSystemPrompt } from './prompts/chat-system-prompt';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private readonly openai = new OpenAI();

  async chat(
    title: string,
    summary: string,
    source: string,
    messages: ChatMessage[],
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: chatSystemPrompt(title, summary, source) },
        ...messages,
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
