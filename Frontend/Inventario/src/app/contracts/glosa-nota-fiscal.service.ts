import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GlosaNotaFiscal, GlosaNotaFiscalPayload } from './glosa-nota-fiscal.model';

@Injectable({ providedIn: 'root' })
export class GlosaNotaFiscalService {
  private readonly baseUrl = `${environment.apiBaseUrl}/glosasnotasfiscais`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<GlosaNotaFiscal[]> {
    return this.http.get<GlosaNotaFiscal[]>(this.baseUrl);
  }

  create(payload: GlosaNotaFiscalPayload): Observable<GlosaNotaFiscal> {
    return this.http.post<GlosaNotaFiscal>(this.baseUrl, payload);
  }

  update(id: string, payload: GlosaNotaFiscalPayload): Observable<GlosaNotaFiscal> {
    return this.http.put<GlosaNotaFiscal>(`${this.baseUrl}/${id}`, payload);
  }
}
