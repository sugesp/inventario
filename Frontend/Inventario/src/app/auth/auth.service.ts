import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageParams, PagedResult } from '../shared/pagination.model';
import { AuthResponse, AuthSession, ChangePasswordPayload, LoginPayload, PreRegisterPayload, RegisterPayload, UserSummary } from './auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'contratos.auth';
  private readonly baseUrl = `${environment.apiBaseUrl}/auth`;
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readSession());

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  get session(): AuthSession | null {
    return this.sessionSubject.value;
  }

  get token(): string | null {
    return this.session?.token ?? null;
  }

  get isAuthenticated(): boolean {
    if (!this.session) {
      return false;
    }

    return new Date(this.session.expiresAt).getTime() > Date.now();
  }

  get isAdmin(): boolean {
    return this.session?.perfil === 'Administrador';
  }

  get canManageContratos(): boolean {
    return this.session?.perfil === 'Administrador' || this.session?.perfil === 'Contratos';
  }

  get canManageFinanceiro(): boolean {
    return this.session?.perfil === 'Administrador'
      || this.session?.perfil === 'Contratos'
      || this.session?.perfil === 'Financeiro';
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  preRegister(payload: PreRegisterPayload): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${this.baseUrl}/pre-register`, payload);
  }

  updateUser(userId: string, payload: RegisterPayload): Observable<UserSummary> {
    return this.http.put<UserSummary>(`${this.baseUrl}/users/${userId}`, payload);
  }

  getUsers(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(`${this.baseUrl}/users`);
  }

  getPagedUsers(params: PageParams): Observable<PagedResult<UserSummary>> {
    return this.http.get<PagedResult<UserSummary>>(`${this.baseUrl}/users/paged`, {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        term: params.term,
      },
    });
  }

  getContratoUsers(): Observable<Array<{ id: string; nome: string; cpf: string }>> {
    return this.http.get<Array<{ id: string; nome: string; cpf: string }>>(`${this.baseUrl}/users/contratos`);
  }

  changePassword(payload: ChangePasswordPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/change-password`, payload).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  resetPassword(userId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/users/${userId}/reset-password`, {});
  }

  logout(redirectToAuth = true): void {
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
    if (redirectToAuth) {
      this.router.navigate(['/auth']);
    }
  }

  private persistSession(response: AuthResponse): void {
    localStorage.setItem(this.storageKey, JSON.stringify(response));
    this.sessionSubject.next(response);
  }

  private readSession(): AuthSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
