import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RestoPagar, RestoPagarPayload } from './resto-pagar.model';

@Injectable({ providedIn: 'root' })
export class RestoPagarService {
  private readonly baseUrl = `${environment.apiBaseUrl}/restospagar`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<RestoPagar[]> {
    return this.http.get<RestoPagar[]>(this.baseUrl);
  }

  create(payload: RestoPagarPayload): Observable<RestoPagar> {
    return this.http.post<RestoPagar>(this.baseUrl, payload);
  }

  update(id: string, payload: RestoPagarPayload): Observable<RestoPagar> {
    return this.http.put<RestoPagar>(`${this.baseUrl}/${id}`, payload);
  }
}
