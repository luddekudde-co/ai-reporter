import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatArticleContext {
  title: string;
  summary: string;
  source: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private readonly api: ApiService) {}

  sendMessage(
    article: ChatArticleContext,
    messages: ChatMessage[],
  ): Observable<{ reply: string }> {
    return this.api.post<{ reply: string }>('chat', { ...article, messages });
  }
}
