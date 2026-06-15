import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PageViewAuditPayload {
  path: string;
  title?: string | null;
  previousPath?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = `${environment.apiBaseUrl}/auditoria`;

  constructor(private readonly http: HttpClient) { }

  trackPageView(payload: PageViewAuditPayload): void {
    this.http.post<void>(`${this.baseUrl}/page-view`, payload).pipe(
      catchError(() => EMPTY)
    ).subscribe();
  }
}
