import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Levantamento, LevantamentoCompartilharPayload, LevantamentoCreatePayload, LevantamentoItem } from './levantamento.model';

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

  compartilhar(levantamentoId: string, payload: LevantamentoCompartilharPayload): Observable<Levantamento> {
    return this.http.put<Levantamento>(`${this.baseUrl}/${levantamentoId}/compartilhamentos`, payload);
  }

  confirmarItem(levantamentoId: string, tombamento: string, tombamentoAntigo = '', descricao = ''): Observable<LevantamentoItem> {
    return this.http.post<LevantamentoItem>(`${this.baseUrl}/${levantamentoId}/itens`, { tombamento, tombamentoAntigo, descricao });
  }

  deleteItem(levantamentoId: string, itemId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${levantamentoId}/itens/${itemId}`);
  }

  delete(levantamentoId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${levantamentoId}`);
  }
}
