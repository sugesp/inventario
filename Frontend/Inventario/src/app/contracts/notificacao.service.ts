import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacao, NotificacaoPayload } from './notificacao.model';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/notificacoes`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Notificacao[]> {
    return this.http.get<Notificacao[]>(this.baseUrl);
  }

  create(payload: NotificacaoPayload): Observable<Notificacao> {
    return this.http.post<Notificacao>(this.baseUrl, payload);
  }

  update(id: string, payload: NotificacaoPayload): Observable<Notificacao> {
    return this.http.put<Notificacao>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
