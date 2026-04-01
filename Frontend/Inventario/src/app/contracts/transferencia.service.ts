import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Transferencia, TransferenciaPayload } from './transferencia.model';

@Injectable({ providedIn: 'root' })
export class TransferenciaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/transferencias`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Transferencia[]> {
    return this.http.get<Transferencia[]>(this.baseUrl);
  }

  getById(id: string): Observable<Transferencia> {
    return this.http.get<Transferencia>(`${this.baseUrl}/${id}`);
  }

  create(payload: TransferenciaPayload): Observable<Transferencia> {
    return this.http.post<Transferencia>(this.baseUrl, payload);
  }

  update(id: string, payload: TransferenciaPayload): Observable<Transferencia> {
    return this.http.put<Transferencia>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
