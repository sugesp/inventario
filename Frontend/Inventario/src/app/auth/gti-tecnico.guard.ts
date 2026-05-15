import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class GtiTecnicoGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (!this.authService.isAuthenticated) {
      return this.router.createUrlTree(['/auth']);
    }

    return this.authService.canAccessGtiTecnico ? true : this.router.createUrlTree(['/dashboard']);
  }
}
