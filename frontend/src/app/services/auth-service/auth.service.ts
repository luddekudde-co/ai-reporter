import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  getStoredToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken(): void {
    localStorage.removeItem('accessToken');
  }

  redirectToGoogle(): void {
    window.location.href = '/api/auth/google';
  }
}
