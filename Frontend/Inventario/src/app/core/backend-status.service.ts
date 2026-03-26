import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BackendStatusService {
  private readonly unavailableSubject = new BehaviorSubject(false);
  private readonly healthUrl = `${environment.apiBaseUrl}/health`;

  readonly unavailable$ = this.unavailableSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get isUnavailable(): boolean {
    return this.unavailableSubject.value;
  }

  markUnavailable(): void {
    this.unavailableSubject.next(true);
  }

  markAvailable(): void {
    this.unavailableSubject.next(false);
  }

  checkHealth() {
    return this.http.get<{ status?: string }>(this.healthUrl).pipe(
      map((response) => response.status === 'ok')
    );
  }
}
