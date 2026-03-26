import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Aditivo, AditivoPayload } from './aditivo.model';

@Injectable({ providedIn: 'root' })
export class AditivoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/aditivos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Aditivo[]> {
    return this.http.get<Aditivo[]>(this.baseUrl);
  }

  create(payload: AditivoPayload): Observable<Aditivo> {
    return this.http.post<Aditivo>(this.baseUrl, payload);
  }

  update(id: string, payload: AditivoPayload): Observable<Aditivo> {
    return this.http.put<Aditivo>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
