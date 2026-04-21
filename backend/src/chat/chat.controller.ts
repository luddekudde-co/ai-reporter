import { Body, Controller, Post } from '@nestjs/common';
import { ChatService, ChatMessage } from './chat.service';

interface ChatRequestDto {
  title: string;
  summary: string;
  source: string;
  messages: ChatMessage[];
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() body: ChatRequestDto) {
    const reply = await this.chatService.chat(
      body.title,
      body.summary,
      body.source,
      body.messages,
    );
    return { reply };
  }
}
