# Article Chat — Deep Dive with AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Deep Dive with AI" link on the article detail page with an inline chat panel that lets users discuss the article with an AI.

**Architecture:** A stateless `POST /api/chat` endpoint receives article context (title, summary, source) plus full conversation history from the frontend, builds a system prompt, and calls OpenAI. The frontend holds all state in signals inside `ArticleDetailComponent` and renders a new `ArticleChatComponent` below the summary card when the user clicks the toggle button.

**Tech Stack:** NestJS + OpenAI SDK (backend), Angular 19 signals + HttpClient (frontend)

---

## File Map

**Create:**

- `backend/src/chat/prompts/chat-system-prompt.ts` — system prompt template
- `backend/src/chat/chat.service.ts` — calls OpenAI with article context + history
- `backend/src/chat/chat.service.spec.ts` — unit test for ChatService
- `backend/src/chat/chat.controller.ts` — POST /api/chat handler
- `backend/src/chat/chat.module.ts` — NestJS module
- `frontend/src/app/core/services/chat.service.ts` — HTTP wrapper
- `frontend/src/app/features/article/article-chat/article-chat.component.ts`
- `frontend/src/app/features/article/article-chat/article-chat.component.html`
- `frontend/src/app/features/article/article-chat/article-chat.component.scss`

**Modify:**

- `backend/src/app.module.ts` — register ChatModule
- `frontend/src/app/core/services/api.service.ts` — add `post<T>` method
- `frontend/src/app/features/article/article-detail.component.ts` — add chat signals + sendMessage
- `frontend/src/app/features/article/article-detail.component.html` — toggle button + chat panel
- `frontend/src/app/features/article/article-detail.component.scss` — button styles

---

## Task 1: Backend — Chat System Prompt

**Files:**

- Create: `backend/src/chat/prompts/chat-system-prompt.ts`

- [ ] **Step 1: Create the prompt template**

```ts
// backend/src/chat/prompts/chat-system-prompt.ts
export const chatSystemPrompt = (
  title: string,
  summary: string,
  source: string,
) =>
  `You are an AI assistant helping a reader understand and discuss a news article.

Article title: ${title}
Source: ${source}
Summary: ${summary}

Answer questions about this article clearly and concisely. If the user asks about something unrelated to the article, gently steer the conversation back to the topic.`;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/chat/prompts/chat-system-prompt.ts
git commit -m "feat: add chat system prompt template"
```

---

## Task 2: Backend — ChatService

**Files:**

- Create: `backend/src/chat/chat.service.ts`
- Create: `backend/src/chat/chat.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// backend/src/chat/chat.service.spec.ts
import { Test } from "@nestjs/testing";
import { ChatService } from "./chat.service";

jest.mock("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Test reply" } }],
        }),
      },
    },
  })),
}));

describe("ChatService", () => {
  let service: ChatService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ChatService],
    }).compile();
    service = module.get(ChatService);
  });

  it("returns the AI reply text", async () => {
    const reply = await service.chat("Title", "Summary", "Source", [
      { role: "user", content: "What is this about?" },
    ]);
    expect(reply).toBe("Test reply");
  });

  it("returns empty string when OpenAI returns no content", async () => {
    const OpenAI = (await import("openai")).default as jest.Mock;
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
    const reply = await svc.chat("T", "S", "Src", []);
    expect(reply).toBe("");
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (ChatService not found)**

```bash
cd backend && npm run test -- --testPathPattern=chat.service.spec
```

Expected: FAIL — `Cannot find module './chat.service'`

- [ ] **Step 3: Implement ChatService**

```ts
// backend/src/chat/chat.service.ts
import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { chatSystemPrompt } from "./prompts/chat-system-prompt";

export interface ChatMessage {
  role: "user" | "assistant";
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
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: chatSystemPrompt(title, summary, source) },
        ...messages,
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd backend && npm run test -- --testPathPattern=chat.service.spec
```

Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add backend/src/chat/chat.service.ts backend/src/chat/chat.service.spec.ts
git commit -m "feat: add ChatService with OpenAI integration"
```

---

## Task 3: Backend — ChatController + ChatModule

**Files:**

- Create: `backend/src/chat/chat.controller.ts`
- Create: `backend/src/chat/chat.module.ts`

- [ ] **Step 1: Create ChatController**

```ts
// backend/src/chat/chat.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { ChatService, ChatMessage } from "./chat.service";

interface ChatRequestDto {
  title: string;
  summary: string;
  source: string;
  messages: ChatMessage[];
}

@Controller("chat")
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
```

- [ ] **Step 2: Create ChatModule**

```ts
// backend/src/chat/chat.module.ts
import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

- [ ] **Step 3: Register ChatModule in AppModule**

In `backend/src/app.module.ts`, add `ChatModule` to the imports array:

```ts
import { ChatModule } from './chat/chat.module';

// inside @Module imports array, add:
ChatModule,
```

Full updated file:

```ts
// backend/src/app.module.ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ArticlesModule } from "./articles/articles.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { AiProcessingModule } from "./ai-processing/ai-processing.module";
import { DigestModule } from "./digest/digest.module";
import { ChatModule } from "./chat/chat.module";

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (url) {
    return { url };
  }
  return { host: "localhost", port: 6379 };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({ connection: redisConnection() }),
    PrismaModule,
    ArticlesModule,
    IngestionModule,
    AiProcessingModule,
    DigestModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: Verify backend compiles and endpoint is reachable**

```bash
cd backend && npm run build
```

Expected: build completes with no errors.

Then with the backend running (`npm run start:dev`), smoke test:

```bash
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","summary":"A test article.","source":"TestSource","messages":[{"role":"user","content":"What is this about?"}]}' \
  | jq .
```

Expected: `{ "reply": "..." }` with a non-empty string.

- [ ] **Step 5: Commit**

```bash
git add backend/src/chat/chat.controller.ts backend/src/chat/chat.module.ts backend/src/app.module.ts
git commit -m "feat: add ChatController and ChatModule, register in AppModule"
```

---

## Task 4: Frontend — Add `post` to ApiService

**Files:**

- Modify: `frontend/src/app/core/services/api.service.ts`

- [ ] **Step 1: Add the `post` method**

```ts
// frontend/src/app/core/services/api.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  get<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${path}`, {
      params: params as Record<string, string>,
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${path}`, body);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/core/services/api.service.ts
git commit -m "feat: add post method to ApiService"
```

---

## Task 5: Frontend — ChatService

**Files:**

- Create: `frontend/src/app/core/services/chat.service.ts`

- [ ] **Step 1: Create ChatService**

```ts
// frontend/src/app/core/services/chat.service.ts
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatArticleContext {
  title: string;
  summary: string;
  source: string;
}

@Injectable({ providedIn: "root" })
export class ChatService {
  constructor(private readonly api: ApiService) {}

  sendMessage(
    article: ChatArticleContext,
    messages: ChatMessage[],
  ): Observable<{ reply: string }> {
    return this.api.post<{ reply: string }>("chat", { ...article, messages });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/core/services/chat.service.ts
git commit -m "feat: add frontend ChatService"
```

---

## Task 6: Frontend — ArticleChatComponent

**Files:**

- Create: `frontend/src/app/features/article/article-chat/article-chat.component.ts`
- Create: `frontend/src/app/features/article/article-chat/article-chat.component.html`
- Create: `frontend/src/app/features/article/article-chat/article-chat.component.scss`

- [ ] **Step 1: Create the component TypeScript**

```ts
// frontend/src/app/features/article/article-chat/article-chat.component.ts
/**
 * ArticleChatComponent — renders the chat message list and input row.
 * All state lives in the parent (ArticleDetailComponent); this component
 * is purely presentational: it receives messages + isSending as inputs
 * and emits a send event when the user submits a message.
 */
import {
  Component,
  input,
  output,
  ElementRef,
  ViewChild,
  AfterViewChecked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ChatMessage } from "../../../core/services/chat.service";

@Component({
  selector: "app-article-chat",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./article-chat.component.html",
  styleUrl: "./article-chat.component.scss",
})
export class ArticleChatComponent implements AfterViewChecked {
  messages = input<ChatMessage[]>([]);
  isSending = input<boolean>(false);
  send = output<string>();

  @ViewChild("messageList") messageList!: ElementRef<HTMLElement>;

  draft = "";

  ngAfterViewChecked(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  submit(): void {
    const text = this.draft.trim();
    if (!text || this.isSending()) return;
    this.send.emit(text);
    this.draft = "";
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }
}
```

- [ ] **Step 2: Create the template**

```html
<!-- frontend/src/app/features/article/article-chat/article-chat.component.html -->
<!-- Chat panel: scrollable message list + input row -->
<div class="c-article-chat">
  <div class="c-article-chat__messages" #messageList>
    @for (message of messages(); track $index) {
    <div
      class="c-article-chat__message"
      [class.c-article-chat__message--user]="message.role === 'user'"
      [class.c-article-chat__message--assistant]="message.role === 'assistant'"
    >
      {{ message.content }}
    </div>
    } @if (isSending()) {
    <div
      class="c-article-chat__message c-article-chat__message--assistant c-article-chat__message--thinking"
    >
      Thinking…
    </div>
    }
  </div>

  <div class="c-article-chat__input-row">
    <textarea
      class="c-article-chat__input"
      [(ngModel)]="draft"
      (keydown)="onKeydown($event)"
      placeholder="Ask a question about this article…"
      rows="2"
      [disabled]="isSending()"
    ></textarea>
    <button
      class="c-article-chat__send"
      (click)="submit()"
      [disabled]="isSending() || !draft.trim()"
    >
      Send
    </button>
  </div>
</div>
```

- [ ] **Step 3: Create the styles**

```scss
// frontend/src/app/features/article/article-chat/article-chat.component.scss
.c-article-chat {
  border-top: 1px solid var(--color-border);
  margin-top: 24px;
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__messages {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 360px;
    overflow-y: auto;
  }

  &__message {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-body-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    align-self: flex-start;

    &--user {
      align-self: flex-end;
      background: var(--color-accent);
      color: white;
      border-color: transparent;
    }

    &--thinking {
      opacity: 0.5;
      font-style: italic;
    }
  }

  &__input-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
  }

  &__input {
    flex: 1;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    font-family: inherit;
    color: var(--color-body-text);

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  &__send {
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s ease;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/article/article-chat/
git commit -m "feat: add ArticleChatComponent"
```

---

## Task 7: Frontend — Wire ArticleDetailComponent

**Files:**

- Modify: `frontend/src/app/features/article/article-detail.component.ts`
- Modify: `frontend/src/app/features/article/article-detail.component.html`
- Modify: `frontend/src/app/features/article/article-detail.component.scss`

- [ ] **Step 1: Update the component TypeScript**

```ts
// frontend/src/app/features/article/article-detail.component.ts
/**
 * ArticleDetailComponent — shows the full details of a single article.
 * Fetches article by ID from the route params and displays title, source, date, summary, and original URL.
 * Also manages the inline AI chat panel state: toggling, sending messages, and holding history.
 */
import { Component, computed, inject, OnInit, signal } from "@angular/core";
import { DatePipe } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { ArticlesService, Article } from "../../core/services/articles.service";
import { ChatService, ChatMessage } from "../../core/services/chat.service";
import { ArticleChatComponent } from "./article-chat/article-chat.component";

@Component({
  selector: "app-article-detail",
  standalone: true,
  imports: [RouterLink, DatePipe, ArticleChatComponent],
  templateUrl: "./article-detail.component.html",
  styleUrl: "./article-detail.component.scss",
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
    if (!level) return "Unrated";
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
    const id = Number(this.route.snapshot.paramMap.get("id"));
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
    this.chatOpen.update((open) => !open);
  }

  sendMessage(text: string): void {
    const article = this.article();
    if (!article) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    this.messages.update((msgs) => [...msgs, userMessage]);
    this.isSending.set(true);

    this.chatService
      .sendMessage(
        {
          title: article.title,
          summary: article.summary ?? "",
          source: article.source,
        },
        this.messages(),
      )
      .subscribe({
        next: ({ reply }) => {
          this.messages.update((msgs) => [
            ...msgs,
            { role: "assistant", content: reply },
          ]);
          this.isSending.set(false);
        },
        error: () => {
          this.messages.update((msgs) => [
            ...msgs,
            {
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            },
          ]);
          this.isSending.set(false);
        },
      });
  }
}
```

- [ ] **Step 2: Update the template**

Replace the existing `article-detail.component.html` with:

```html
<!-- Article detail: dark hero header with breadcrumb/pills/title, light body with source bar + two-column layout -->
<div class="c-article-detail">
  @if (isLoading()) {
  <div class="c-article-detail__state">Loading article...</div>
  } @else if (notFound()) {
  <div class="c-article-detail__state">Article not found.</div>
  } @else {
  <div class="c-article-detail__hero">
    <div class="c-article-detail__hero-inner">
      <a class="c-article-detail__back" routerLink="/feed"
        >&larr; Back to Feed</a
      >
      <div class="c-article-detail__pills">
        @if (article()!.category) {
        <span class="c-article-detail__pill--category"
          >{{ article()!.category }}</span
        >
        }
        <span class="c-article-detail__pill--impact">{{ impactLabel() }}</span>
      </div>
      <h1 class="c-article-detail__title">{{ article()!.title }}</h1>
      <p class="c-article-detail__byline">
        {{ article()!.source }} &middot; {{ article()!.publishedAt | date: "MMMM
        d, yyyy" }}
      </p>
    </div>
  </div>

  <div class="c-article-detail__body">
    <div class="c-article-detail__body-inner">
      <div class="c-article-detail__source-bar">
        <span>Source: {{ sourceHostname() }}</span>
        <a
          [href]="article()!.url"
          target="_blank"
          rel="noopener noreferrer"
          class="c-article-detail__source-link"
        >
          View original &rarr;
        </a>
      </div>

      <div class="c-article-detail__columns">
        <div class="c-article-detail__main">
          @if (article()!.summary) {
          <div class="c-article-detail__summary-card">
            <h2 class="c-article-detail__summary-heading">Summary</h2>
            <hr class="c-article-detail__summary-divider" />
            <p class="c-article-detail__summary-text">
              {{ article()!.summary }}
            </p>
            <button class="c-article-detail__deep-dive" (click)="toggleChat()">
              {{ chatOpen() ? 'Close AI Chat ✕' : 'Deep Dive with AI →' }}
            </button>

            @if (chatOpen()) {
            <app-article-chat
              [messages]="messages()"
              [isSending]="isSending()"
              (send)="sendMessage($event)"
            />
            }
          </div>
          }
        </div>

        <div class="c-article-detail__sidebar">
          @if (article()!.category) {
          <div class="c-article-detail__tags-card">
            <h3 class="c-article-detail__tags-heading">Tags</h3>
            <div class="c-article-detail__tags">
              <span class="c-article-detail__tag"
                >{{ article()!.category }}</span
              >
            </div>
          </div>
          }
        </div>
      </div>
    </div>
  </div>
  }
</div>
```

- [ ] **Step 3: Update SCSS — change `__deep-dive` from anchor to button**

In `frontend/src/app/features/article/article-detail.component.scss`, replace the `&__deep-dive` rule:

```scss
&__deep-dive {
  display: inline-block;
  margin-top: 28px;
  background: var(--color-accent);
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}
```

- [ ] **Step 4: Run prettier on changed files**

```bash
cd frontend && npx prettier --write \
  src/app/features/article/article-detail.component.ts \
  src/app/features/article/article-detail.component.html \
  src/app/features/article/article-detail.component.scss \
  src/app/core/services/chat.service.ts \
  src/app/features/article/article-chat/article-chat.component.ts \
  src/app/features/article/article-chat/article-chat.component.html \
  src/app/features/article/article-chat/article-chat.component.scss \
  src/app/core/services/api.service.ts
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

1. Start backend: `cd backend && npm run start:dev`
2. Start frontend: `cd frontend && ng serve`
3. Open `http://localhost:4200`, navigate to any article with a summary
4. Click "Deep Dive with AI →" — chat panel should appear below the summary
5. Type a question and press Enter or click Send
6. AI reply appears in the message list
7. Click "Close AI Chat ✕" — panel disappears, messages reset on next open

- [ ] **Step 7: Run backend prettier**

```bash
cd backend && npx prettier --write \
  src/chat/chat.service.ts \
  src/chat/chat.service.spec.ts \
  src/chat/chat.controller.ts \
  src/chat/chat.module.ts \
  src/chat/prompts/chat-system-prompt.ts
```

- [ ] **Step 8: Commit**

```bash
git add \
  frontend/src/app/features/article/article-detail.component.ts \
  frontend/src/app/features/article/article-detail.component.html \
  frontend/src/app/features/article/article-detail.component.scss
git commit -m "feat: wire AI chat panel into article detail page"
```
