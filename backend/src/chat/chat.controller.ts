import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ChatService, ChatMessage } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';

interface ChatRequestDto {
  title: string;
  summary: string;
  source: string;
  messages: ChatMessage[];
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
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
