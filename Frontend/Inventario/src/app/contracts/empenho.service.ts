import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Empenho, EmpenhoPayload } from './empenho.model';

@Injectable({ providedIn: 'root' })
export class EmpenhoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/empenhos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Empenho[]> {
    return this.http.get<Empenho[]>(this.baseUrl);
  }

  create(payload: EmpenhoPayload): Observable<Empenho> {
    return this.http.post<Empenho>(this.baseUrl, payload);
  }

  update(id: string, payload: EmpenhoPayload): Observable<Empenho> {
    return this.http.put<Empenho>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
