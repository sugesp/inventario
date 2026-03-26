import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Liquidacao, LiquidacaoPayload } from './liquidacao.model';

@Injectable({ providedIn: 'root' })
export class LiquidacaoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/liquidacoes`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Liquidacao[]> {
    return this.http.get<Liquidacao[]>(this.baseUrl);
  }

  create(payload: LiquidacaoPayload): Observable<Liquidacao> {
    return this.http.post<Liquidacao>(this.baseUrl, payload);
  }

  update(id: string, payload: LiquidacaoPayload): Observable<Liquidacao> {
    return this.http.put<Liquidacao>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
