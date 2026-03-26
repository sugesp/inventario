import { Component } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

interface DashboardShortcut {
  title: string;
  description: string;
  route: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly shortcuts: DashboardShortcut[] = [
    {
      title: 'Itens inventariados',
      description: 'Consulte e mantenha o registro dos bens inventariados com fotos e status.',
      route: '/itens-inventariados',
      icon: 'fa-box-archive',
    },
    {
      title: 'Usuários',
      description: 'Gerencie acessos e perfis das pessoas que vão operar o inventário.',
      route: '/usuarios',
      icon: 'fa-users',
      adminOnly: true,
    },
    {
      title: 'Equipes',
      description: 'Organize as equipes responsáveis pelos locais e pelos levantamentos.',
      route: '/equipes',
      icon: 'fa-people-group',
      adminOnly: true,
    },
    {
      title: 'Locais',
      description: 'Estruture os locais inventariados e vincule cada um à equipe responsável.',
      route: '/locais',
      icon: 'fa-location-dot',
      adminOnly: true,
    },
  ];

  constructor(readonly authService: AuthService) {}

  get visibleShortcuts(): DashboardShortcut[] {
    return this.shortcuts.filter((item) => !item.adminOnly || this.authService.isAdmin);
  }
}
