import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LaudoTecnico, LaudoTecnicoPayload } from './laudo-tecnico.model';

@Injectable({ providedIn: 'root' })
export class LaudoTecnicoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/laudostecnicos`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<LaudoTecnico[]> {
    return this.http.get<LaudoTecnico[]>(this.baseUrl);
  }

  getById(id: string): Observable<LaudoTecnico> {
    return this.http.get<LaudoTecnico>(`${this.baseUrl}/${id}`);
  }

  create(payload: LaudoTecnicoPayload): Observable<LaudoTecnico> {
    return this.http.post<LaudoTecnico>(this.baseUrl, payload);
  }
}
