import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Equipe, EquipePayload } from './equipe.model';

@Injectable({ providedIn: 'root' })
export class EquipeService {
  private readonly baseUrl = `${environment.apiBaseUrl}/equipes`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(this.baseUrl);
  }

  create(payload: EquipePayload): Observable<Equipe> {
    return this.http.post<Equipe>(this.baseUrl, payload);
  }

  update(id: string, payload: EquipePayload): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
