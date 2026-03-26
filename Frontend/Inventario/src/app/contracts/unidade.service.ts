import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Unidade, UnidadePayload } from './unidade.model';

@Injectable({ providedIn: 'root' })
export class UnidadeService {
  private readonly baseUrl = `${environment.apiBaseUrl}/unidades`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Unidade[]> {
    return this.http.get<Unidade[]>(this.baseUrl);
  }

  create(payload: UnidadePayload): Observable<Unidade> {
    return this.http.post<Unidade>(this.baseUrl, payload);
  }

  update(id: string, payload: UnidadePayload): Observable<Unidade> {
    return this.http.put<Unidade>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
