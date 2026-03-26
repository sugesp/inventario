import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { BackendStatusService } from '../core/backend-status.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly authService: AuthService,
    private readonly backendStatusService: BackendStatusService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.token;
    const authReq = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : req;

    return next.handle(authReq).pipe(
      tap(() => {
        this.backendStatusService.markAvailable();
      }),
      catchError((error: HttpErrorResponse) => {
        if (this.isBackendUnavailable(error)) {
          this.backendStatusService.markUnavailable();
        }

        if (error.status === 401) {
          this.authService.logout();
        }

        return throwError(() => error);
      })
    );
  }

  private isBackendUnavailable(error: HttpErrorResponse): boolean {
    return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
  }
}
