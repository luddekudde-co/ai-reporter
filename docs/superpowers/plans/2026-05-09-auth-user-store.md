# Auth UserStore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up real login/register/logout using a `UserStore` signal service that owns all auth UI state, while `AuthService` stays as a pure HTTP + token-storage layer.

**Architecture:** `UserStore` (signal store, `providedIn: 'root'`) owns `currentUser`, `isLoggedIn`, `loginError`, `registerError`, `isLoading`. On construction it restores session from localStorage by decoding the stored JWT. `AuthService` becomes a pure HTTP layer. `NavbarComponent` injects `UserStore` and drives the template reactively.

**Tech Stack:** Angular 19+ signals, RxJS (subscribe in store methods), TypeScript

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `frontend/src/app/services/auth-service/auth.service.ts` | Remove state — keep HTTP calls + token storage helpers only |
| Create | `frontend/src/app/stores/user.store.ts` | All auth UI state + login/register/logout methods |
| Modify | `frontend/src/app/features/navbar/navbar.component.ts` | Inject UserStore, remove direct AuthService usage for state |
| Modify | `frontend/src/app/features/navbar/navbar.component.html` | Conditional guest/user UI, error messages in modals |
| Modify | `frontend/src/app/features/navbar/navbar.component.scss` | Styles for user email display + sign-out button |

---

## Task 1: Slim `AuthService` to pure HTTP

**Files:**
- Modify: `frontend/src/app/services/auth-service/auth.service.ts`

- [ ] **Step 1: Replace the file content**

```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RegisterResponse {
  id: string;
  email: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  getStoredToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
  }

  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', { email, password });
  }

  login(email: string, password: string): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>('/api/auth/login', { email, password });
  }
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/services/auth-service/auth.service.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/services/auth-service/auth.service.ts
git commit -m "refactor(auth): slim AuthService to pure HTTP layer"
```

---

## Task 2: Create `UserStore`

**Files:**
- Create: `frontend/src/app/stores/user.store.ts`

- [ ] **Step 1: Create the stores directory and file**

```bash
mkdir -p frontend/src/app/stores
```

- [ ] **Step 2: Write the store**

```typescript
import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../services/auth-service/auth.service';

interface CurrentUser {
  email: string;
}

function decodeTokenEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp && Date.now() / 1000 > payload.exp;
    return isExpired ? null : (payload.email ?? null);
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class UserStore {
  private authService = inject(AuthService);

  private _currentUser = signal<CurrentUser | null>(null);
  private _loginError = signal<string | null>(null);
  private _registerError = signal<string | null>(null);
  private _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly loginError = this._loginError.asReadonly();
  readonly registerError = this._registerError.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    const token = this.authService.getStoredToken();
    if (token) {
      const email = decodeTokenEmail(token);
      if (email) {
        this._currentUser.set({ email });
      } else {
        this.authService.clearAccessToken();
      }
    }
  }

  login(email: string, password: string): void {
    this._loginError.set(null);
    this._isLoading.set(true);
    this.authService.login(email, password).subscribe({
      next: ({ accessToken }) => {
        this.authService.setAccessToken(accessToken);
        this._currentUser.set({ email });
        this._isLoading.set(false);
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Invalid email or password';
        this._loginError.set(message);
        this._isLoading.set(false);
      },
    });
  }

  register(email: string, password: string): void {
    this._registerError.set(null);
    this._isLoading.set(true);
    this.authService.register(email, password).subscribe({
      next: () => {
        // Auto-login after successful registration
        this.authService.login(email, password).subscribe({
          next: ({ accessToken }) => {
            this.authService.setAccessToken(accessToken);
            this._currentUser.set({ email });
            this._isLoading.set(false);
          },
          error: () => {
            this._registerError.set('Registered but could not log in. Please sign in manually.');
            this._isLoading.set(false);
          },
        });
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Could not create account. Email may already be in use.';
        this._registerError.set(message);
        this._isLoading.set(false);
      },
    });
  }

  logout(): void {
    this.authService.clearAccessToken();
    this._currentUser.set(null);
    this._loginError.set(null);
    this._registerError.set(null);
  }
}
```

- [ ] **Step 3: Run prettier**

```bash
cd frontend && npx prettier --write src/app/stores/user.store.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/stores/user.store.ts
git commit -m "feat(auth): add UserStore signal service"
```

---

## Task 3: Update `NavbarComponent` TypeScript

**Files:**
- Modify: `frontend/src/app/features/navbar/navbar.component.ts`

- [ ] **Step 1: Replace the component class**

```typescript
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModalComponent } from '../../design/modal/modal.component';
import { InputComponent } from '../../design/input/input.component';
import { UserStore } from '../../stores/user.store';

// Handles nav links, auth modals (sign in / sign up), and the logged-in user bar.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ModalComponent, InputComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  userStore = inject(UserStore);

  menuOpen = signal(false);
  signInModalOpen = signal(false);
  signUpModalOpen = signal(false);

  emailValue = '';
  passwordValue = '';

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  modal(type: 'signIn' | 'signUp'): void {
    this.emailValue = '';
    this.passwordValue = '';
    if (type === 'signIn') {
      this.signInModalOpen.set(!this.signInModalOpen());
    } else {
      this.signUpModalOpen.set(!this.signUpModalOpen());
    }
  }

  signIn(email: string, password: string): void {
    this.userStore.login(email, password);
    // Close modal on next microtask so the error signal has time to be set first
    // (if login succeeds the modal closes, if it fails the error renders)
    Promise.resolve().then(() => {
      if (!this.userStore.loginError()) {
        this.signInModalOpen.set(false);
      }
    });
  }

  signUp(email: string, password: string): void {
    this.userStore.register(email, password);
    Promise.resolve().then(() => {
      if (!this.userStore.registerError()) {
        this.signUpModalOpen.set(false);
      }
    });
  }

  logout(): void {
    this.userStore.logout();
    this.closeMenu();
  }
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/navbar/navbar.component.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/navbar/navbar.component.ts
git commit -m "feat(auth): wire NavbarComponent to UserStore"
```

---

## Task 4: Update `NavbarComponent` template

**Files:**
- Modify: `frontend/src/app/features/navbar/navbar.component.html`

- [ ] **Step 1: Replace the template**

```html
<nav class="c-navbar">
  <a class="c-navbar__brand" routerLink="/">AI-Reporter</a>

  <div class="c-navbar__links">
    <a
      class="c-navbar__link"
      routerLink="/feed"
      routerLinkActive="c-navbar__link--is-active"
      >Feed</a
    >
    <a
      class="c-navbar__link"
      routerLink="/digest"
      routerLinkActive="c-navbar__link--is-active"
      >News Digest</a
    >
  </div>

  <div class="c-navbar__actions">
    @if (userStore.isLoggedIn()) {
      <span class="c-navbar__user-email">{{ userStore.currentUser()?.email }}</span>
      <button class="c-navbar__sign-out" (click)="logout()">Sign Out</button>
    } @else {
      <button class="c-navbar__sign-in" (click)="modal('signIn')">Sign In</button>
      <button class="c-navbar__sign-up" (click)="modal('signUp')">Sign Up</button>
    }
  </div>

  <app-modal
    title="Sign in"
    [isOpen]="signInModalOpen()"
    (closed)="signInModalOpen.set(false)"
  >
    <app-input
      placeholder="Enter your email"
      type="email"
      [(value)]="emailValue"
    ></app-input>
    <app-input
      placeholder="Enter your password"
      type="password"
      [(value)]="passwordValue"
    ></app-input>
    @if (userStore.loginError()) {
      <p class="c-navbar__modal-error">{{ userStore.loginError() }}</p>
    }
    <button (click)="signIn(emailValue, passwordValue)" [disabled]="userStore.isLoading()">
      Sign in
    </button>
  </app-modal>

  <app-modal
    title="Sign up"
    [isOpen]="signUpModalOpen()"
    (closed)="signUpModalOpen.set(false)"
  >
    <app-input
      [(value)]="emailValue"
      placeholder="Enter your email"
      type="email"
    ></app-input>
    <app-input
      [(value)]="passwordValue"
      placeholder="Enter your password"
      type="password"
    ></app-input>
    @if (userStore.registerError()) {
      <p class="c-navbar__modal-error">{{ userStore.registerError() }}</p>
    }
    <button (click)="signUp(emailValue, passwordValue)" [disabled]="userStore.isLoading()">
      Sign up
    </button>
  </app-modal>

  <button
    type="button"
    class="c-navbar__hamburger"
    (click)="toggleMenu()"
    [attr.aria-expanded]="menuOpen()"
    aria-label="Toggle navigation"
  >
    {{ menuOpen() ? "✕" : "☰" }}
  </button>
</nav>

@if (menuOpen()) {
  <div class="c-navbar__mobile-menu">
    <a
      class="c-navbar__mobile-link"
      routerLink="/feed"
      routerLinkActive="c-navbar__mobile-link--is-active"
      (click)="closeMenu()"
      >Feed</a
    >
    <a
      class="c-navbar__mobile-link"
      routerLink="/digest"
      routerLinkActive="c-navbar__mobile-link--is-active"
      (click)="closeMenu()"
      >News Digest</a
    >
    @if (userStore.isLoggedIn()) {
      <button class="c-navbar__mobile-link" (click)="logout()">Sign Out</button>
    } @else {
      <button class="c-navbar__mobile-link" (click)="modal('signIn'); closeMenu()">Sign In</button>
    }
  </div>
}
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/navbar/navbar.component.html
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/navbar/navbar.component.html
git commit -m "feat(auth): update navbar template for logged-in state and error messages"
```

---

## Task 5: Add styles for user email and sign-out button

**Files:**
- Modify: `frontend/src/app/features/navbar/navbar.component.scss`

- [ ] **Step 1: Add new rules inside `.c-navbar { }` after `&__sign-up { }`**

Find the closing brace of `&__sign-up { ... }` (currently around line 78) and insert after it:

```scss
  &__user-email {
    font-size: 13px;
    color: var(--color-muted);
  }

  &__sign-out {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-muted);
    border: none;
    background-color: transparent;
    cursor: pointer;

    &:hover {
      color: white;
    }
  }

  &__modal-error {
    font-size: 12px;
    color: #e05c5c;
    margin: 4px 0 0;
  }
```

- [ ] **Step 2: Run prettier**

```bash
cd frontend && npx prettier --write src/app/features/navbar/navbar.component.scss
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/features/navbar/navbar.component.scss
git commit -m "feat(auth): add navbar styles for user email, sign-out, and modal errors"
```

---

## Task 6: Fix modal close timing

The `signIn()` / `signUp()` methods use `Promise.resolve().then()` to check error state after the HTTP call sets it. But the HTTP call is async — the modal will close immediately before the response arrives. Fix this by closing the modal inside the store's `next` callback instead.

**Files:**
- Modify: `frontend/src/app/stores/user.store.ts`
- Modify: `frontend/src/app/features/navbar/navbar.component.ts`

- [ ] **Step 1: Add optional success callbacks to `UserStore` methods**

Replace the `login` and `register` method signatures in `user.store.ts`:

```typescript
  login(email: string, password: string, onSuccess?: () => void): void {
    this._loginError.set(null);
    this._isLoading.set(true);
    this.authService.login(email, password).subscribe({
      next: ({ accessToken }) => {
        this.authService.setAccessToken(accessToken);
        this._currentUser.set({ email });
        this._isLoading.set(false);
        onSuccess?.();
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Invalid email or password';
        this._loginError.set(message);
        this._isLoading.set(false);
      },
    });
  }

  register(email: string, password: string, onSuccess?: () => void): void {
    this._registerError.set(null);
    this._isLoading.set(true);
    this.authService.register(email, password).subscribe({
      next: () => {
        this.authService.login(email, password).subscribe({
          next: ({ accessToken }) => {
            this.authService.setAccessToken(accessToken);
            this._currentUser.set({ email });
            this._isLoading.set(false);
            onSuccess?.();
          },
          error: () => {
            this._registerError.set('Registered but could not log in. Please sign in manually.');
            this._isLoading.set(false);
          },
        });
      },
      error: (err) => {
        const message = err?.error?.message ?? 'Could not create account. Email may already be in use.';
        this._registerError.set(message);
        this._isLoading.set(false);
      },
    });
  }
```

- [ ] **Step 2: Update `NavbarComponent` to pass callbacks**

Replace `signIn` and `signUp` in `navbar.component.ts`:

```typescript
  signIn(email: string, password: string): void {
    this.userStore.login(email, password, () => this.signInModalOpen.set(false));
  }

  signUp(email: string, password: string): void {
    this.userStore.register(email, password, () => this.signUpModalOpen.set(false));
  }
```

- [ ] **Step 3: Run prettier on both files**

```bash
cd frontend && npx prettier --write src/app/stores/user.store.ts src/app/features/navbar/navbar.component.ts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/stores/user.store.ts frontend/src/app/features/navbar/navbar.component.ts
git commit -m "fix(auth): close modals via success callback instead of microtask check"
```

---

## Verification

- [ ] Start the dev server: `cd frontend && ng serve`
- [ ] Open `http://localhost:4200` — navbar shows "Sign In" and "Sign Up"
- [ ] Click "Sign Up", register with a new email — modal closes, navbar shows email + "Sign Out"
- [ ] Reload the page — user remains logged in (token restored from localStorage)
- [ ] Click "Sign Out" — navbar reverts to guest state
- [ ] Click "Sign In" with wrong password — modal stays open, red error message appears
- [ ] Click "Sign Up" with an already-registered email — modal stays open, red error message appears
- [ ] On mobile width — hamburger menu shows "Sign Out" when logged in, "Sign In" when logged out
