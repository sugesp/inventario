import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageParams, PagedResult } from '../shared/pagination.model';
import { Contrato, ContratoPayload } from './contrato.model';

@Injectable({
  providedIn: 'root',
})
export class ContratoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/contratos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Contrato[]> {
    return this.http.get<Contrato[]>(this.baseUrl);
  }

  getPaged(params: PageParams): Observable<PagedResult<Contrato>> {
    return this.http.get<PagedResult<Contrato>>(`${this.baseUrl}/paged`, {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        term: params.term,
      },
    });
  }

  getById(id: string): Observable<Contrato> {
    return this.http.get<Contrato>(`${this.baseUrl}/${id}`);
  }

  create(payload: ContratoPayload): Observable<Contrato> {
    return this.http.post<Contrato>(this.baseUrl, payload);
  }

  update(id: string, payload: ContratoPayload): Observable<Contrato> {
    return this.http.put<Contrato>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
