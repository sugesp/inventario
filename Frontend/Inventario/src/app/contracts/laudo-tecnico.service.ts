import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LaudoTecnico, LaudoTecnicoIdentificacaoPayload, LaudoTecnicoPayload } from './laudo-tecnico.model';

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

  updateIdentificacao(id: string, payload: LaudoTecnicoIdentificacaoPayload): Observable<LaudoTecnico> {
    return this.http.put<LaudoTecnico>(`${this.baseUrl}/${id}/identificacao`, payload);
  }

  addFotos(id: string, fotos: Array<{ categoria: string; file: File }>): Observable<LaudoTecnico> {
    const payload = new FormData();
    fotos.forEach((foto) => {
      payload.append('fotos', foto.file, foto.file.name);
      payload.append('categorias', foto.categoria);
    });
    return this.http.post<LaudoTecnico>(`${this.baseUrl}/${id}/fotos`, payload);
  }

  getFoto(laudoId: string, fotoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${laudoId}/fotos/${fotoId}`, { responseType: 'blob' });
  }
}
