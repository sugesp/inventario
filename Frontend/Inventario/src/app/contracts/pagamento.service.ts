import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Pagamento, PagamentoPayload } from './pagamento.model';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/pagamentos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Pagamento[]> {
    return this.http.get<Pagamento[]>(this.baseUrl);
  }

  create(payload: PagamentoPayload): Observable<Pagamento> {
    return this.http.post<Pagamento>(this.baseUrl, payload);
  }

  update(id: string, payload: PagamentoPayload): Observable<Pagamento> {
    return this.http.put<Pagamento>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
