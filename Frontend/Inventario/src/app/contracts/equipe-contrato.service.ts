import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EquipeContrato, EquipeContratoPayload } from './equipe-contrato.model';

@Injectable({ providedIn: 'root' })
export class EquipeContratoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/equipes-contrato`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<EquipeContrato[]> {
    return this.http.get<EquipeContrato[]>(this.baseUrl);
  }

  create(payload: EquipeContratoPayload): Observable<EquipeContrato> {
    return this.http.post<EquipeContrato>(this.baseUrl, payload);
  }

  update(id: string, payload: EquipeContratoPayload): Observable<EquipeContrato> {
    return this.http.put<EquipeContrato>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
