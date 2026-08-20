import { Component, OnInit } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ComissaoService } from '../../contracts/comissao.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  canAccessPainel = false;
  checkingPainelAccess = false;

  constructor(
    readonly authService: AuthService,
    private readonly comissaoService: ComissaoService
  ) {}

  ngOnInit(): void {
    this.checkPainelAccess();
  }

  get dashboardScope(): string {
    return this.authService.isAdmin ? 'Visão administrativa' : 'Minha área';
  }

  get firstName(): string {
    const name = this.authService.session?.nome?.trim();
    return name?.split(/\s+/)[0] || 'usuário';
  }

  private checkPainelAccess(): void {
    if (this.authService.isAdmin || this.authService.hasPermission('PainelTV')) {
      this.canAccessPainel = true;
      return;
    }

    const userId = this.authService.session?.userId;
    if (!userId || !this.authService.canAccessComissoesConsulta) {
      return;
    }

    this.checkingPainelAccess = true;
    this.comissaoService.getActive().pipe(
      map((comissao) => comissao.presidenteId === userId),
      catchError(() => of(false))
    ).subscribe((canAccess) => {
      this.canAccessPainel = canAccess;
      this.checkingPainelAccess = false;
    });
  }
}
