import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

type ModuleKey = 'levantamento' | 'administrador' | 'gti';

interface ModuleMenuAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  visible: () => boolean;
}

interface ModuleMenuConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions: ModuleMenuAction[];
}

@Component({
  selector: 'app-module-menu',
  templateUrl: './module-menu.component.html',
  styleUrl: './module-menu.component.scss',
})
export class ModuleMenuComponent {
  private readonly configs: Record<ModuleKey, ModuleMenuConfig> = {
    levantamento: {
      eyebrow: 'Levantamento',
      title: 'Levantamento',
      subtitle: 'Acesse as rotinas para criar levantamentos e acompanhar registros cadastrados.',
      actions: [
        {
          title: 'Novo levantamento',
          description: 'Criar ou continuar um levantamento e confirmar tombamentos por leitura ou digitação.',
          icon: 'fa-solid fa-qrcode',
          route: '/levantamentos',
          visible: () => this.authService.canManageLevantamentos,
        },
        {
          title: 'Listagem de levantamentos',
          description: 'Consultar levantamentos, exportar relatórios, compartilhar ou revisar itens já confirmados.',
          icon: 'fa-solid fa-table-list',
          route: '/levantamentos-lista',
          visible: () => this.authService.canManageLevantamentos,
        },
      ],
    },
    administrador: {
      eyebrow: 'Administrador',
      title: 'Administrador',
      subtitle: 'Gerencie acessos, cadastros estruturais e parâmetros administrativos do sistema.',
      actions: [
        {
          title: 'Usuários',
          description: 'Aprovar cadastros, ajustar permissões, alterar status e redefinir senhas.',
          icon: 'fa-solid fa-users',
          route: '/usuarios',
          visible: () => this.authService.isAdmin,
        },
        {
          title: 'Unidades administrativas',
          description: 'Manter unidades, siglas e dados usados nos fluxos de transferência e inventário.',
          icon: 'fa-solid fa-sitemap',
          route: '/unidades-administrativas',
          visible: () => this.authService.isAdmin,
        },
      ],
    },
    gti: {
      eyebrow: 'GTI',
      title: 'GTI',
      subtitle: 'Acesse laudos técnicos e transferências de bens em um ponto único.',
      actions: [
        {
          title: 'Nova transferência',
          description: 'Criar uma transferência, adicionar bens e registrar dados de entrega.',
          icon: 'fa-solid fa-right-left',
          route: '/transferir',
          visible: () => this.authService.canAccessGtiGestor,
        },
        {
          title: 'Transferências',
          description: 'Acompanhar transferências, editar rascunhos e consultar histórico de movimentações.',
          icon: 'fa-solid fa-truck-ramp-box',
          route: '/transferencias',
          visible: () => this.authService.canAccessGtiGestor,
        },
        {
          title: 'Laudo técnico',
          description: 'Criar laudos técnicos e registrar avaliação de equipamentos.',
          icon: 'fa-solid fa-file-circle-check',
          route: '/laudo-tecnico',
          visible: () => this.authService.canAccessGtiTecnico,
        },
        {
          title: 'Laudos técnicos',
          description: 'Consultar laudos cadastrados e acompanhar avaliações já realizadas.',
          icon: 'fa-solid fa-file-lines',
          route: '/laudos-tecnicos',
          visible: () => this.authService.canAccessLaudos,
        },
      ],
    },
  };

  constructor(
    readonly authService: AuthService,
    private readonly route: ActivatedRoute
  ) {}

  get config(): ModuleMenuConfig {
    return this.configs[this.moduleKey];
  }

  get visibleActions(): ModuleMenuAction[] {
    return this.config.actions.filter((action) => action.visible());
  }

  private get moduleKey(): ModuleKey {
    return (this.route.snapshot.data['module'] as ModuleKey | undefined) ?? 'levantamento';
  }
}
