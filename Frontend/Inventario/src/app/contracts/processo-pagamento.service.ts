import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProcessoPagamento, ProcessoPagamentoPayload } from './processo-pagamento.model';

@Injectable({ providedIn: 'root' })
export class ProcessoPagamentoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/processospagamento`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ProcessoPagamento[]> {
    return this.http.get<ProcessoPagamento[]>(this.baseUrl);
  }

  create(payload: ProcessoPagamentoPayload): Observable<ProcessoPagamento> {
    return this.http.post<ProcessoPagamento>(this.baseUrl, payload);
  }

  update(id: string, payload: ProcessoPagamentoPayload): Observable<ProcessoPagamento> {
    return this.http.put<ProcessoPagamento>(`${this.baseUrl}/${id}`, payload);
  }
}
