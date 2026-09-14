import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Comissao, ComissaoPayload } from './comissao.model';

@Injectable({ providedIn: 'root' })
export class ComissaoService {
  private readonly baseUrl = `${environment.apiBaseUrl}/comissoes`;
  private readonly laudoMembrosAtualizados = new Subject<Comissao>();
  readonly laudoMembrosAtualizados$ = this.laudoMembrosAtualizados.asObservable();

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<Comissao[]> {
    return this.http.get<Comissao[]>(this.baseUrl);
  }

  getById(id: string): Observable<Comissao> {
    return this.http.get<Comissao>(`${this.baseUrl}/${id}`);
  }

  getActive(): Observable<Comissao> {
    return this.http.get<Comissao>(`${this.baseUrl}/ativa`);
  }

  create(payload: ComissaoPayload): Observable<Comissao> {
    return this.http.post<Comissao>(this.baseUrl, payload);
  }

  update(id: string, payload: ComissaoPayload): Observable<Comissao> {
    return this.http.post<Comissao>(`${this.baseUrl}/${id}/update`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  updateLaudoMembros(id: string, usuarioIds: string[]): Observable<Comissao> {
    return this.http.put<Comissao>(`${this.baseUrl}/${id}/laudo-membros`, usuarioIds).pipe(
      tap((comissao) => this.laudoMembrosAtualizados.next(comissao))
    );
  }
}
