---
title: Authentication — Sign Up / Login
date: 2026-04-21
status: implemented (partial — Google OAuth, /auth/me, and policy checkbox deferred)
---

# Authentication Design

## Context

The app currently has no authentication. Several features (starting with AI chat, later comments and bookmarks) should only be available to logged-in users. This spec covers implementing full email/password + Google OAuth auth, a reusable modal component, and a gating mechanism that opens the login modal automatically when an unauthenticated user tries to use a protected feature.

---

## Approach

NestJS JWT + Passport. Custom auth fully integrated with the existing NestJS + Prisma + PostgreSQL stack. Access tokens stored in `localStorage`, **15-minute expiry**, no refresh token. Google OAuth deferred.

---

## Data Model

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}
```

> Note: `name`, `googleId`, `acceptedPolicyAt`, and `updatedAt` were deferred — the implemented model is simpler.

---

## Backend

### New packages
- `@nestjs/jwt`, `@nestjs/passport`
- `passport`, `passport-local`, `passport-jwt`, `passport-google-oauth20`
- `bcrypt`, `@types/bcrypt`
- `@types/passport-google-oauth20`

### Auth endpoints (implemented)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | `{ email, password }` → `{ id, email, createdAt }` |
| POST | `/api/auth/login` | Public | `{ email, password }` → `{ accessToken }` |

Deferred: `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/me`

### Protected endpoints
- `POST /api/chat` — guarded by `JwtAuthGuard` — returns 401 if no valid token

### Module structure
```
backend/src/auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  jwt.strategy.ts
  jwt.auth.guard.ts
  dto/
    register.dto.ts
    login.dto.ts
```

### Env vars required
```
JWT_SECRET=...
JWT_EXPIRES_IN=15m
```

---

## Frontend

### Implemented files

```
frontend/src/app/
  stores/
    user.store.ts              ← signal store: owns all auth UI state
  services/auth-service/
    auth.service.ts            ← pure HTTP layer + localStorage token helpers
  interceptors/
    auth.interceptor.ts        ← attaches Authorization: Bearer header
  design/
    modal/                     ← reusable backdrop + container (existing)
  features/navbar/
    navbar.component.*         ← Sign In / Sign Up modals live here
```

### `UserStore` (`frontend/src/app/stores/user.store.ts`)
Signal service (`providedIn: 'root'`) that owns all auth UI state.

```ts
// Public signals (readonly)
currentUser: Signal<{ email: string } | null>
isLoggedIn: Signal<boolean>      // computed
loginError: Signal<string | null>
registerError: Signal<string | null>
isLoading: Signal<boolean>

// Methods
login(email, password, onSuccess?: () => void): void
register(email, password, onSuccess?: () => void): void
logout(): void
```

Constructor decodes the stored JWT from `localStorage` to restore session on page load. Clears the token if it's expired. `register()` auto-logs-in after successful registration.

### `AuthService` (`frontend/src/app/services/auth-service/auth.service.ts`)
Pure HTTP layer — no state.

```ts
getStoredToken(): string | null
setAccessToken(token: string): void
clearAccessToken(): void
register(email, password): Observable<RegisterResponse>
login(email, password): Observable<{ accessToken: string }>
```

### Auth interceptor
Reads token from `localStorage` and injects `Authorization: Bearer <token>` on every outgoing HTTP request.

### Modals
Auth modals are embedded directly inside `NavbarComponent`. No separate auth modal component. Sign In and Sign Up modals open from navbar buttons and close via `onSuccess` callbacks passed to `UserStore.login()` / `UserStore.register()`. Errors display inline inside each modal.

### Gating pattern (for future protected features)
```ts
// Inject UserStore and check before gated action
if (!this.userStore.isLoggedIn()) {
  // redirect or show message — no auto-open modal currently
  return;
}
```

### Deferred
- Google OAuth
- `GET /api/auth/me` endpoint
- Policy agreement checkbox
- Auth route guard (no protected routes yet)

---

## Verification

1. Register with new email → modal closes, navbar shows email + Sign Out
2. Reload page → user remains logged in (token restored from localStorage)
3. Sign Out → navbar reverts to guest state
4. Login with wrong password → modal stays open, red error message appears
5. Register with existing email → modal stays open, red error message appears
6. `POST /api/chat` without token → 401
7. `POST /api/chat` with valid token → response works
