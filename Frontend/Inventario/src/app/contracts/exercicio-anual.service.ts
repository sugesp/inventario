import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExercicioAnual } from './exercicio-anual.model';

@Injectable({ providedIn: 'root' })
export class ExercicioAnualService {
  private readonly baseUrl = `${environment.apiBaseUrl}/exerciciosanuais`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<ExercicioAnual[]> {
    return this.http.get<ExercicioAnual[]>(this.baseUrl);
  }
}
