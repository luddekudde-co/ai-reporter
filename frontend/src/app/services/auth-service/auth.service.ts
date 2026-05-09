import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

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
    window.location.href = `${environment.apiUrl}/auth/google`;
  }
}
