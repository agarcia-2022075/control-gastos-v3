import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private apiUrl = environment.apiUrl;
  private tokenKey = 'auth_token';

  currentUserData: UserResponse | null = null;

  register(data: { name: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  login(credentials: { email: string; password: string }): Observable<{ success: boolean; message: string; data: AuthResponse }> {
    return this.http.post<{ success: boolean; message: string; data: AuthResponse }>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(res => {
          if (res.success && res.data?.token) {
            this.saveToken(res.data.token);
            this.currentUserData = res.data.user;
          }
        })
      );
  }

  googleLogin(data: string | { credential?: string; email?: string; name?: string }): Observable<{ success: boolean; message: string; data: AuthResponse }> {
    const payload = typeof data === 'string' ? { credential: data } : data;
    return this.http.post<{ success: boolean; message: string; data: AuthResponse }>(`${this.apiUrl}/auth/google`, payload)
      .pipe(
        tap(res => {
          if (res.success && res.data?.token) {
            this.saveToken(res.data.token);
            this.currentUserData = res.data.user;
          }
        })
      );
  }

  getCurrentUser(): Observable<{ success: boolean; data: UserResponse }> {
    return this.http.get<{ success: boolean; data: UserResponse }>(`${this.apiUrl}/auth/me`)
      .pipe(
        tap(res => {
          if (res.success && res.data) {
            this.currentUserData = res.data;
          }
        })
      );
  }

  getUsers(): Observable<{ success: boolean; data: UserResponse[] }> {
    return this.http.get<{ success: boolean; data: UserResponse[] }>(`${this.apiUrl}/users`);
  }

  updateUserRole(userId: number, role: 'USER' | 'ADMIN'): Observable<{ success: boolean; message: string; data: UserResponse }> {
    return this.http.patch<{ success: boolean; message: string; data: UserResponse }>(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  saveToken(token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    this.sessionService.startInactivityMonitor();
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  removeToken(): void {
    sessionStorage.removeItem(this.tokenKey);
    this.currentUserData = null;
    this.sessionService.stopInactivityMonitor();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.currentUserData?.role === 'ADMIN';
  }

  logout(): void {
    this.removeToken();
    this.router.navigate(['/login']);
  }
}
