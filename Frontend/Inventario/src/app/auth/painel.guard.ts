import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { ComissaoService } from '../contracts/comissao.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PainelGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly comissaoService: ComissaoService,
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree | Observable<boolean | UrlTree> {
    if (!this.authService.isAuthenticated) {
      return this.router.createUrlTree(['/auth']);
    }

    if (this.authService.isAdmin || this.authService.hasPermission('PainelTV')) {
      return true;
    }

    const usuarioId = this.authService.session?.userId;
    if (!usuarioId) {
      return this.router.createUrlTree(['/dashboard']);
    }

    return this.comissaoService.getActive().pipe(
      map((comissao) =>
        comissao.presidenteId === usuarioId
          ? true
          : this.router.createUrlTree(['/dashboard'])
      ),
      catchError(() => of(this.router.createUrlTree(['/dashboard'])))
    );
  }
}
