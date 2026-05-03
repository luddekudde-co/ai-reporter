/**
 * ArticleDetailComponent — shows the full details of a single article.
 * Fetches article by ID from the route params and displays title, source, date, summary, and original URL.
 * Also manages the inline AI chat panel state: toggling, sending messages, and holding history.
 */
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArticlesService, Article } from '../../core/services/articles.service';
import { ChatService, ChatMessage } from '../../core/services/chat.service';
import { ArticleChatComponent } from './article-chat/article-chat.component';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ArticleChatComponent],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly articlesService = inject(ArticlesService);
  private readonly chatService = inject(ChatService);

  article = signal<Article | null>(null);
  isLoading = signal(true);
  notFound = signal(false);

  chatOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  isSending = signal(false);

  impactLabel = computed(() => {
    const level = this.article()?.impactLevel;
    if (!level) return 'Unrated';
    const word = level.charAt(0) + level.slice(1).toLowerCase();
    return `${word} Impact`;
  });

  sourceHostname = computed(() => {
    try {
      return new URL(this.article()!.url).hostname;
    } catch {
      return this.article()!.url;
    }
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.articlesService.getArticle(id).subscribe({
      next: (article) => {
        this.article.set(article);
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  toggleChat(): void {
    const nowOpen = !this.chatOpen();
    this.chatOpen.set(nowOpen);
    if (!nowOpen) {
      this.messages.set([]);
    }
  }

  sendMessage(text: string): void {
    const article = this.article();
    if (!article) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    this.messages.update((msgs) => [...msgs, userMessage]);
    this.isSending.set(true);

    this.chatService
      .sendMessage(
        {
          title: article.title,
          summary: article.summary ?? '',
          source: article.source,
        },
        this.messages(),
      )
      .subscribe({
        next: ({ reply }) => {
          this.messages.update((msgs) => [
            ...msgs,
            { role: 'assistant', content: reply },
          ]);
          this.isSending.set(false);
        },
        error: (error) => {
          if (error.status === 401) {
            // Unauthorized
            this.messages.update((msgs) => [
              ...msgs,
              {
                role: 'assistant',
                content:
                  'You are unauthenticated. Please log in to use the chat feature.',
              },
            ]);
            this.isSending.set(false);
          } else {
            this.messages.update((msgs) => [
              ...msgs,
              {
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
              },
            ]);
            this.isSending.set(false);
          }
        },
      });
  }
}
