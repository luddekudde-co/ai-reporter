---
title: Article Chat — Deep Dive with AI
date: 2026-04-21
status: draft
---

# Article Chat — Deep Dive with AI

## Overview

Replace the "Deep Dive with AI" link on the article detail page with an inline chat panel. Users can ask questions about the article and discuss it with an AI that has full article context. Chat is session-only (no persistence). Interface is minimal.

---

## Backend

### New module: `ChatModule`

**Endpoint:** `POST /api/chat/:articleId`

**Request body:**
```ts
{
  messages: { role: 'user' | 'assistant'; content: string }[];
}
```

**Behavior:**
1. Fetch article from DB by `articleId` (title + summary).
2. Build a system prompt that anchors the AI to the article context.
3. Prepend system message to the incoming `messages` array.
4. Call OpenAI `gpt-4o-mini` with the full message array (non-streaming).
5. Return `{ reply: string }`.

**Error handling:** Return 404 if article not found. Return 500 with a generic message if OpenAI fails.

**Files to create:**
- `backend/src/chat/chat.module.ts`
- `backend/src/chat/chat.controller.ts`
- `backend/src/chat/chat.service.ts`
- `backend/src/chat/prompts/chat-system-prompt.ts`

Register `ChatModule` in `app.module.ts`.

---

## Frontend

### ChatService

A new injectable service at `frontend/src/app/core/services/chat.service.ts`.

Method: `sendMessage(articleId: number, messages: ChatMessage[]): Observable<{ reply: string }>`

Calls `POST /api/chat/:articleId` with the full message array.

### ArticleDetailComponent changes

Add signals to the existing component:
- `chatOpen = signal(false)`
- `messages = signal<ChatMessage[]>([])`
- `isSending = signal(false)`

Add methods:
- `toggleChat()` — flips `chatOpen`
- `sendMessage(text: string)` — appends user message, calls `ChatService`, appends AI reply

### Template changes

Replace the `<a class="c-article-detail__deep-dive">` anchor with a `<button>` that calls `toggleChat()`.

Below the summary card, conditionally render `<app-article-chat>` when `chatOpen()` is true, passing `messages`, `isSending`, and an `(send)` output.

### New component: `ArticleChatComponent`

Path: `frontend/src/app/features/article/article-chat/`

**Inputs:**
- `messages: ChatMessage[]`
- `isSending: boolean`

**Output:**
- `send: EventEmitter<string>`

**Template:**
- Scrollable `.c-article-chat__messages` list
  - User messages: right-aligned, accent background
  - AI messages: left-aligned, neutral background
- `.c-article-chat__input` row: text input + send button
- Disabled send + spinner while `isSending` is true
- Auto-scroll to bottom on new message

No store needed — all state lives in `ArticleDetailComponent`.

---

## Data Types

```ts
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

Defined once in `chat.service.ts` and exported for reuse in the component.

---

## System Prompt

```
You are an AI assistant helping a reader understand and discuss a news article.

Article title: {title}
Article summary: {summary}

Answer questions about this article clearly and concisely. If the user asks about something unrelated to the article, gently steer back to the topic.
```

---

## Constraints

- Non-streaming responses only (simplest implementation).
- No message persistence — history is lost on navigation.
- No authentication required for the chat endpoint (consistent with the rest of the API).
- Model: `gpt-4o-mini` (consistent with existing AI processing).
