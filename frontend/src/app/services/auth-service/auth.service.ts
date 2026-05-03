import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface RegisterResponse {
  id: string;
  email: string;
  createdAt: Date;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  http = inject(HttpClient);

  accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('accessToken', token);
  }

  clearAccessToken() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
  }

  // Resource?
  register(email: string, password: string): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>('/api/auth/register', {
      email,
      password,
    });
  }

  login(email: string, password: string): Observable<{ accessToken: string }> {
    return this.http.post<{ accessToken: string }>('/api/auth/login', {
      email,
      password,
    });
  }
}
