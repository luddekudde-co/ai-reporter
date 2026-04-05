# CLAUDE.md — AI-Reporter Project Setup Guide

This document summarizes the **current project status**, **architecture decisions**, and the **remaining steps to initialize the frontend and backend environments** for the AI-Reporter project.

It is intended to serve as a persistent reference when working with AI coding assistants.

---

# Project Overview

**Project:** AI-Reporter
**Type:** Full-stack AI news aggregation platform
**Goal:** Learn full-stack development while building a production-style AI pipeline system.

Core capabilities:

* Aggregate AI news from APIs and RSS feeds
* Process content via AI summarization
* Rank and select top daily stories
* Present curated news in a web interface
* Allow contextual AI chat about articles
* Generate weekly AI digests

---

# Tech Stack

## Frontend

Framework

* Angular

Supporting tools

* SCSS styling
* Angular Material (UI components)
* RxJS for reactive data flows

Responsibilities

* Daily feed UI
* Article detail pages
* Weekly digest view
* AI chat interface
* Authentication UI
* Filters and search

Runs locally at:

http://localhost:4200

---

## Backend

Framework

* NestJS (Node.js)

Responsibilities

* REST API
* Authentication
* News retrieval
* AI service integration
* Personalization logic
* Pipeline orchestration
* Chat endpoint

Runs locally at:

http://localhost:3000

---

## Database

Primary database

PostgreSQL

ORM

Prisma

Future extension

pgvector for embeddings and semantic similarity.

---

## Background Processing

Queue system

Redis + BullMQ

Purpose

* asynchronous pipelines
* article ingestion
* deduplication
* AI summarization
* weekly digest generation

---

## AI Layer

Provider

OpenAI API

Used for

* summarization
* article analysis
* embeddings
* contextual chat
* weekly digest generation

---

# Repository Structure

The project uses a **monorepo structure**.

```
ai-reporter/

frontend/
Angular application

backend/
NestJS API server

worker/
background pipelines (future)

docker/
local infrastructure configs

docs/
architecture notes
```

---

# Current Status

Completed:

* Angular project initialized
* NestJS backend project initialized

Not yet completed:

* frontend/backend connection
* database setup
* Prisma setup
* Redis setup
* API endpoints
* pipelines
* authentication
* deployment

---

# Local Development Environment

Development requires the following tools:

Node.js (LTS)

Package manager
npm

Docker Desktop

Git

Optional but useful

Postman or Insomnia for API testing.

---

# Backend Initialization Steps

Navigate to the backend folder.

```
cd backend
```

Install backend dependencies.

```
npm install
```

Install configuration module.

```
npm install @nestjs/config
```

Install Prisma ORM.

```
npm install @prisma/client
npm install prisma --save-dev
```

Initialize Prisma.

```
npx prisma init
```

This creates:

```
backend/prisma/
backend/.env
```

---

# Configure Environment Variables

Edit the backend `.env` file.

Example:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_reporter"

OPENAI_API_KEY="your_key"

NEWS_API_KEY="your_key"
```

These variables must **never be committed to Git**.

---

# Local Database Setup

Use Docker to run PostgreSQL and Redis.

Create a `docker-compose.yml` in the project root.

Example:

```
services:

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ai_reporter
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis
    ports:
      - "6379:6379"
```

Start services:

```
docker compose up -d
```

---

# Database Migration

Once Prisma is configured, run:

```
npx prisma migrate dev
```

This creates the initial database schema.

---

# Running the Backend

From the backend folder:

```
npm run start:dev
```

Server should start at:

http://localhost:3000

---

# Running the Frontend

Navigate to the frontend folder.

```
cd frontend
```

Install dependencies.

```
npm install
```

Start Angular dev server.

```
ng serve
```

Frontend runs at:

http://localhost:4200

---

# Connecting Frontend to Backend

Create an API service in Angular.

Example endpoint base:

```
http://localhost:3000
```

Example API routes (future):

```
GET /articles
GET /articles/:id
POST /chat
POST /auth/login
```

Angular services will call these endpoints.

---

# Recommended Angular Structure

Inside `frontend/src/app` organize code as:

```
core/
global services and guards

shared/
reusable components and models

features/
application features
```

Example:

```
features/

feed/
article/
weekly-digest/
chat/
auth/
```

---

# Next Development Milestones

## Phase 1 — API Foundation

Create backend modules:

```
news
users
ai
auth
pipeline
```

Define first endpoints:

```
GET /articles
GET /articles/:id
```

---

## Phase 2 — News Ingestion Pipeline

Implement:

```
Fetch RSS feeds
Normalize content
Extract article text
Store in database
```

Libraries

* rss-parser
* cheerio
* playwright (optional)

---

## Phase 3 — AI Processing

Add AI pipeline:

```
Generate summaries
Extract tags
Score articles
```

Store processed content in the database.

---

## Phase 4 — Frontend Feed

Build UI components:

```
news cards
article page
category filters
```

Fetch data from backend API.

---

## Phase 5 — Ranking System

Implement scoring algorithm based on:

* source credibility
* recency
* keyword relevance
* impact signals

Select top 20 daily stories.

---

## Phase 6 — AI Chat

Implement contextual chat system.

Flow:

```
user question
→ backend
→ context builder
→ LLM
→ response
```

Context includes:

* current article
* related articles

---

## Phase 7 — Weekly Digest

Weekly pipeline:

```
collect weekly articles
cluster topics
generate AI digest
```

---

# Future Improvements

Later phases may include:

* semantic search using embeddings
* personalization engine
* vector database
* recommendation system
* multi-language support
* social media publishing automation

---

# Development Workflow

Recommended workflow:

```
develop locally
commit changes
push to repository
deploy to staging
verify behavior
deploy to production
```

---

# Key Principles

1. Keep pipelines asynchronous.
2. Never expose API keys to the frontend.
3. Maintain separate environments (local, staging, production).
4. Prioritize simple MVP features before advanced AI logic.

---

# End of Document
