import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConsultaPublicaBem, ConsultaTombamento, InconsistenciaInventario, ItemInventariado, ItemInventariadoMovimentacaoLocal } from './item-inventariado.model';

@Injectable({ providedIn: 'root' })
export class ItemInventariadoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/itensinventariados`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ItemInventariado[]> {
    return this.http.get<ItemInventariado[]>(this.baseUrl);
  }

  getDeleted(): Observable<ItemInventariado[]> {
    return this.http.get<ItemInventariado[]>(`${this.baseUrl}/excluidos`);
  }

  getLocalMovements(): Observable<ItemInventariadoMovimentacaoLocal[]> {
    return this.http.get<ItemInventariadoMovimentacaoLocal[]>(`${this.baseUrl}/movimentacoes-local`);
  }

  getInconsistencias(): Observable<InconsistenciaInventario[]> {
    return this.http.get<InconsistenciaInventario[]>(`${this.baseUrl}/inconsistencias`);
  }

  consultarResumoPublico(tombamento: string): Observable<ConsultaPublicaBem> {
    return this.http.get<ConsultaPublicaBem>(`${this.baseUrl}/consulta-publica/${encodeURIComponent(tombamento)}`);
  }

  consultarTombamento(tombamento: string): Observable<ConsultaTombamento> {
    return this.http.get<ConsultaTombamento>(`${this.baseUrl}/consulta-tombamento/${encodeURIComponent(tombamento)}`);
  }

  existeTombamentoNoLocal(localId: string, tombamento: string): Observable<{ existe: boolean }> {
    return this.http.get<{ existe: boolean }>(
      `${this.baseUrl}/locais/${localId}/tombamentos/${encodeURIComponent(tombamento)}/existe`
    );
  }

  getFoto(itemId: string, fotoId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${itemId}/fotos/${fotoId}`, {
      responseType: 'blob',
    });
  }

  marcarLancamentoEEstado(itemId: string, lancado: boolean, justificativa?: string): Observable<ItemInventariado> {
    return this.http.post<ItemInventariado>(`${this.baseUrl}/${itemId}/lancamento-eestado`, {
      lancado,
      justificativa,
    });
  }

  delete(itemId: string, justificativa: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${itemId}`, {
      body: { justificativa },
    });
  }

  moveToLocal(itemId: string, localDestinoId: string, justificativa: string): Observable<ItemInventariado> {
    return this.http.post<ItemInventariado>(`${this.baseUrl}/${itemId}/mover-local`, {
      localDestinoId,
      justificativa,
    });
  }

  create(payload: FormData): Observable<ItemInventariado> {
    return this.http.post<ItemInventariado>(this.baseUrl, payload);
  }
}
