import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Levantamento, LevantamentoCreatePayload, LevantamentoItem } from './levantamento.model';

@Injectable({ providedIn: 'root' })
export class LevantamentoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/levantamentos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Levantamento[]> {
    return this.http.get<Levantamento[]>(this.baseUrl);
  }

  getById(id: string): Observable<Levantamento> {
    return this.http.get<Levantamento>(`${this.baseUrl}/${id}`);
  }

  create(payload: LevantamentoCreatePayload): Observable<Levantamento> {
    return this.http.post<Levantamento>(this.baseUrl, payload);
  }

  confirmarItem(levantamentoId: string, tombamento: string): Observable<LevantamentoItem> {
    return this.http.post<LevantamentoItem>(`${this.baseUrl}/${levantamentoId}/itens`, { tombamento });
  }
}
