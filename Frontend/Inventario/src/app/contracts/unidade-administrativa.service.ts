import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UnidadeAdministrativa, UnidadeAdministrativaPayload } from './unidade-administrativa.model';

@Injectable({ providedIn: 'root' })
export class UnidadeAdministrativaService {
  private readonly baseUrl = `${environment.apiBaseUrl}/unidadesadministrativas`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<UnidadeAdministrativa[]> {
    return this.http.get<UnidadeAdministrativa[]>(this.baseUrl);
  }

  create(payload: UnidadeAdministrativaPayload): Observable<UnidadeAdministrativa> {
    return this.http.post<UnidadeAdministrativa>(this.baseUrl, payload);
  }

  update(id: string, payload: UnidadeAdministrativaPayload): Observable<UnidadeAdministrativa> {
    return this.http.post<UnidadeAdministrativa>(`${this.baseUrl}/${id}/update`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
