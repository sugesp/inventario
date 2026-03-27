import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConsultaPublicaBem, ItemInventariado } from './item-inventariado.model';

@Injectable({ providedIn: 'root' })
export class ItemInventariadoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/itensinventariados`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ItemInventariado[]> {
    return this.http.get<ItemInventariado[]>(this.baseUrl);
  }

  consultarResumoPublico(tombamento: string): Observable<ConsultaPublicaBem> {
    return this.http.get<ConsultaPublicaBem>(`${this.baseUrl}/consulta-publica/${encodeURIComponent(tombamento)}`);
  }

  create(payload: FormData): Observable<ItemInventariado> {
    return this.http.post<ItemInventariado>(this.baseUrl, payload);
  }
}
