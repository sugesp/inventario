import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PageParams, PagedResult } from '../shared/pagination.model';
import { Fornecedor, FornecedorCnpjLookup, FornecedorPayload } from './fornecedor.model';

@Injectable({ providedIn: 'root' })
export class FornecedorService {
  private readonly baseUrl = `${environment.apiBaseUrl}/fornecedores`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Fornecedor[]> {
    return this.http.get<Fornecedor[]>(this.baseUrl);
  }

  getPaged(params: PageParams): Observable<PagedResult<Fornecedor>> {
    return this.http.get<PagedResult<Fornecedor>>(`${this.baseUrl}/paged`, {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
        term: params.term,
      },
    });
  }

  create(payload: FornecedorPayload): Observable<Fornecedor> {
    return this.http.post<Fornecedor>(this.baseUrl, payload);
  }

  update(id: string, payload: FornecedorPayload): Observable<Fornecedor> {
    return this.http.put<Fornecedor>(`${this.baseUrl}/${id}`, payload);
  }

  lookupByCnpj(cnpj: string): Observable<FornecedorCnpjLookup | null> {
    return this.http.get<FornecedorCnpjLookup | null>(`${this.baseUrl}/consulta-cnpj/${cnpj}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
