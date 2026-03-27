import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
import { ItemInventariado } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';

interface DashboardShortcut {
  title: string;
  description: string;
  route: string;
  icon: string;
  adminOnly?: boolean;
}

interface DashboardCountCard {
  label: string;
  value: number;
  meta: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly shortcuts: DashboardShortcut[] = [
    {
      title: 'Inventariar item',
      description: 'Siga o fluxo completo de conferência, classificação e fotos para cadastrar um bem.',
      route: '/inventariar',
      icon: 'fa-box-archive',
    },
    {
      title: 'Listagem de itens',
      description: 'Acompanhe todos os itens inventariados já registrados no sistema.',
      route: '/lista-inventariados',
      icon: 'fa-table-list',
      adminOnly: true,
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

  loadingStats = false;
  itensInventariados: ItemInventariado[] = [];

  constructor(
    readonly authService: AuthService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.authService.isAdmin) {
      this.loadDashboardStats();
    }
  }

  get visibleShortcuts(): DashboardShortcut[] {
    return this.shortcuts.filter((item) => !item.adminOnly || this.authService.isAdmin);
  }

  get totalInventariados(): number {
    return this.itensInventariados.length;
  }

  get equipeCards(): DashboardCountCard[] {
    const grouped = new Map<string, number>();

    this.itensInventariados.forEach((item) => {
      const key = item.equipeDescricao?.trim() || 'Equipe não informada';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

    return [...grouped.entries()]
      .map(([label, value]) => ({
        label,
        value,
        meta: value === 1 ? 'item inventariado' : 'itens inventariados',
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  get localCards(): DashboardCountCard[] {
    const grouped = new Map<string, number>();

    this.itensInventariados.forEach((item) => {
      const key = item.localNome?.trim() || 'Local não informado';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

    return [...grouped.entries()]
      .map(([label, value]) => ({
        label,
        value,
        meta: value === 1 ? 'item inventariado' : 'itens inventariados',
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  loadDashboardStats(): void {
    this.loadingStats = true;
    this.itemInventariadoService.getAll().subscribe({
      next: (data) => {
        this.itensInventariados = data;
        this.loadingStats = false;
      },
      error: () => {
        this.loadingStats = false;
        this.toastr.error('Não foi possível carregar as estatísticas do dashboard.');
      },
    });
  }
}
