import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Local, LocalPayload } from './local.model';

@Injectable({ providedIn: 'root' })
export class LocalService {
  private readonly baseUrl = `${environment.apiBaseUrl}/locais`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Local[]> {
    return this.http.get<Local[]>(this.baseUrl);
  }

  create(payload: LocalPayload): Observable<Local> {
    return this.http.post<Local>(this.baseUrl, payload);
  }

  update(id: string, payload: LocalPayload): Observable<Local> {
    return this.http.put<Local>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
