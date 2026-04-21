---
title: Authentication — Sign Up / Login
date: 2026-04-21
status: draft
---

# Authentication Design

## Context

The app currently has no authentication. Several features (starting with AI chat, later comments and bookmarks) should only be available to logged-in users. This spec covers implementing full email/password + Google OAuth auth, a reusable modal component, and a gating mechanism that opens the login modal automatically when an unauthenticated user tries to use a protected feature.

---

## Approach

NestJS JWT + Passport (Option A). Custom auth fully integrated with the existing NestJS + Prisma + PostgreSQL stack. Access tokens stored in `localStorage`, 7-day expiry, no refresh token (keep it simple for now). Google OAuth via `passport-google-oauth20`.

---

## Data Model

```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  passwordHash     String?   // null for Google-only users
  googleId         String?   @unique
  acceptedPolicyAt DateTime? // recorded at sign-up for compliance
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

---

## Backend

### New packages
- `@nestjs/jwt`, `@nestjs/passport`
- `passport`, `passport-local`, `passport-jwt`, `passport-google-oauth20`
- `bcrypt`, `@types/bcrypt`
- `@types/passport-google-oauth20`

### Auth endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | `{ email, password, name, acceptedPolicy }` → `{ accessToken, user }` |
| POST | `/api/auth/login` | Public | `{ email, password }` → `{ accessToken, user }` |
| GET | `/api/auth/google` | Public | Redirect to Google consent screen |
| GET | `/api/auth/google/callback` | Public | Google callback → JWT → redirect to `/?token=...` |
| GET | `/api/auth/me` | JWT | Returns `{ id, email, name }` |

### Protected endpoints
- `POST /api/chat` — add `@UseGuards(JwtAuthGuard)` — returns 401 if no valid token

### Module structure
```
backend/src/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  strategies/
    jwt.strategy.ts
    google.strategy.ts
  guards/
    jwt-auth.guard.ts
  dto/
    register.dto.ts
    login.dto.ts
```

### New env vars required
```
JWT_SECRET=...
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## Frontend

### New packages
None — uses Angular's built-in `HttpClient` interceptors and `@angular/router` guards.

### New files

```
frontend/src/app/
  design/
    modal/
      modal.component.ts       ← reusable backdrop + container
      modal.component.html
      modal.component.scss

  features/auth/
    auth-modal/
      auth-modal.component.ts  ← sign-in / sign-up tabs + Google button
      auth-modal.component.html
      auth-modal.component.scss
    auth-policy/
      auth-policy.component.ts ← policy text + required checkbox (reusable)
    auth.service.ts            ← login(), register(), logout(), handleGoogleCallback()
    auth.store.ts              ← signal store: currentUser, isAuthenticated, modalOpen
    auth.interceptor.ts        ← attaches Bearer token; on 401 → clears token + opens modal
```

### Modal component API
```ts
// Inputs
@Input() title: string
@Input() isOpen: boolean

// Outputs
@Output() closed = new EventEmitter<void>()
```
Renders a backdrop div + centered container. Clicking backdrop emits `closed`. Used by `AuthModalComponent` and any future modals.

### Auth store (signal store)
```ts
currentUser: Signal<User | null>
isAuthenticated: Signal<boolean>
modalOpen: Signal<boolean>

openModal(): void
closeModal(): void
setUser(user: User, token: string): void
logout(): void
```

### Gating pattern
The chat component injects `AuthStore`. On message send:
```ts
if (!this.authStore.isAuthenticated()) {
  this.authStore.openModal();
  return;
}
```
The `AuthModalComponent` is rendered in `AppComponent` and controlled by `authStore.modalOpen`.

### Google OAuth callback
After Google redirects to `/?token=...`, `AppComponent` reads the query param on init, calls `authStore.setUser()`, and clears the param from the URL.

### Policy agreement
Sign-up form includes a required checkbox: *"I agree to the [Privacy Policy] — we store your email and name to identify your account."* Cannot submit without checking it. `acceptedPolicy: true` sent in the register request body.

---

## Verification

1. Register with email/password → receive JWT → `GET /api/auth/me` returns user
2. Login with wrong password → 401 response
3. `POST /api/chat` without token → 401
4. `POST /api/chat` with valid token → response works
5. Click chat while logged out → auth modal opens automatically
6. Complete Google OAuth → redirected back, logged in, can use chat
7. Sign up without checking policy checkbox → form submit blocked
8. Logout → token cleared → chat blocked again
