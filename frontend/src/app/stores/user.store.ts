// Signal store owning all auth UI state. Restores session from localStorage on
// app boot by decoding the stored JWT; clears it if the token is expired.
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
  private _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
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

  signInWithGoogle(): void {
    this.authService.redirectToGoogle();
  }

  completeGoogleSignIn(token: string): void {
    this.authService.setAccessToken(token);
    const email = decodeTokenEmail(token);
    if (email) {
      this._currentUser.set({ email });
    }
  }

  logout(): void {
    this.authService.clearAccessToken();
    this._currentUser.set(null);
  }
}
