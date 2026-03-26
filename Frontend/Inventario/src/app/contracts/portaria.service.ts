import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Portaria, PortariaPayload } from './portaria.model';

@Injectable({ providedIn: 'root' })
export class PortariaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/portarias`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Portaria[]> {
    return this.http.get<Portaria[]>(this.baseUrl);
  }

  create(payload: PortariaPayload): Observable<Portaria> {
    return this.http.post<Portaria>(this.baseUrl, payload);
  }

  update(id: string, payload: PortariaPayload): Observable<Portaria> {
    return this.http.put<Portaria>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
