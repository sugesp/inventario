import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, forkJoin, of } from 'rxjs';
import { UserSummary } from '../../auth/auth.model';
import { AuthService } from '../../auth/auth.service';
import { Comissao } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { ItemInventariado } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { LaudoTecnico } from '../../contracts/laudo-tecnico.model';
import { LaudoTecnicoService } from '../../contracts/laudo-tecnico.service';
import { Levantamento } from '../../contracts/levantamento.model';
import { LevantamentoService } from '../../contracts/levantamento.service';
import { Transferencia } from '../../contracts/transferencia.model';
import { TransferenciaService } from '../../contracts/transferencia.service';
import { UnidadeAdministrativa } from '../../contracts/unidade-administrativa.model';
import { UnidadeAdministrativaService } from '../../contracts/unidade-administrativa.service';

interface DashboardShortcut {
  title: string;
  description: string;
  route: string;
  icon: string;
  visible: () => boolean;
}

interface DashboardCountCard {
  label: string;
  value: number;
  meta: string;
}

interface DashboardSummaryCard extends DashboardCountCard {
  icon: string;
  route?: string;
  visible: boolean;
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
      visible: () => this.authService.canManageInventario,
    },
    {
      title: 'Listagem de itens',
      description: 'Acompanhe todos os itens inventariados já registrados no sistema.',
      route: '/lista-inventariados',
      icon: 'fa-table-list',
      visible: () => this.authService.canAccessInventarioConsultas,
    },
    {
      title: 'Consulta tombamento',
      description: 'Consulte a situação consolidada de um bem a partir do tombamento.',
      route: '/consulta-tombamento',
      icon: 'fa-magnifying-glass',
      visible: () => this.authService.canAccessConsultaTombamento,
    },
    {
      title: 'Levantamentos',
      description: 'Crie um levantamento e confirme rapidamente os tombamentos lidos por QR code.',
      route: '/levantamentos',
      icon: 'fa-qrcode',
      visible: () => this.authService.canManageLevantamentos,
    },
    {
      title: 'Nova transferência',
      description: 'Leia os tombamentos, monte a remessa no celular e conclua a entrega depois no computador.',
      route: '/transferir',
      icon: 'fa-right-left',
      visible: () => this.authService.canAccessGtiGestor,
    },
    {
      title: 'Laudo Técnico',
      description: 'Preencha o laudo individual por etapas, sem depender do PDF impresso.',
      route: '/laudo-tecnico',
      icon: 'fa-file-circle-check',
      visible: () => this.authService.canAccessGtiTecnico,
    },
    {
      title: 'Usuários',
      description: 'Gerencie acessos e perfis das pessoas que vão operar o inventário.',
      route: '/usuarios',
      icon: 'fa-users',
      visible: () => this.authService.isAdmin,
    },
    {
      title: 'Unidades administrativas',
      description: 'Estruture as unidades usadas como destino nas transferências.',
      route: '/unidades-administrativas',
      icon: 'fa-sitemap',
      visible: () => this.authService.isAdmin,
    },
  ];

  loadingStats = false;
  itensInventariados: ItemInventariado[] = [];
  comissoes: Comissao[] = [];
  levantamentos: Levantamento[] = [];
  transferencias: Transferencia[] = [];
  laudos: LaudoTecnico[] = [];
  usuarios: UserSummary[] = [];
  unidades: UnidadeAdministrativa[] = [];

  constructor(
    readonly authService: AuthService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly comissaoService: ComissaoService,
    private readonly levantamentoService: LevantamentoService,
    private readonly transferenciaService: TransferenciaService,
    private readonly laudoTecnicoService: LaudoTecnicoService,
    private readonly unidadeAdministrativaService: UnidadeAdministrativaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  get visibleShortcuts(): DashboardShortcut[] {
    return this.shortcuts.filter((item) => item.visible());
  }

  get totalInventariados(): number {
    return this.itensInventariados.length;
  }

  get dashboardScope(): string {
    return this.authService.isAdmin ? 'Visão geral administrativa' : 'Minha área';
  }

  get summaryCards(): DashboardSummaryCard[] {
    const transferenciaPendenteCount = this.transferencias.filter((item) => this.normalize(item.status) !== 'finalizada').length;
    const laudosComClassificacao = this.laudos.filter((item) => item.classificacaoFinal?.trim()).length;
    const activeUsers = this.usuarios.filter((item) => this.normalize(item.status) === 'ativo').length;
    const activeComissoes = this.comissoes.filter((item) => item.status === 'Ativa').length;

    return [
      {
        label: 'Levantamentos',
        value: this.levantamentos.length,
        meta: `${this.totalItensLevantamento} tombamento(s) confirmado(s)`,
        icon: 'fa-qrcode',
        route: '/levantamentos-lista',
        visible: this.authService.canManageLevantamentos,
      },
      {
        label: 'Itens inventariados',
        value: this.totalInventariados,
        meta: `${this.itensLancadosEEstado} lançado(s) no E-Estado`,
        icon: 'fa-clipboard-check',
        route: '/lista-inventariados',
        visible: this.authService.canAccessInventarioConsultas,
      },
      {
        label: 'Comissões',
        value: this.comissoes.length,
        meta: `${activeComissoes} comissão(ões) ativa(s)`,
        icon: 'fa-people-group',
        route: '/comissoes',
        visible: this.authService.canAccessComissoesConsulta,
      },
      {
        label: 'Transferências',
        value: this.transferencias.length,
        meta: `${transferenciaPendenteCount} pendente(s)`,
        icon: 'fa-right-left',
        route: '/transferencias',
        visible: this.authService.canAccessGtiGestor,
      },
      {
        label: 'Laudos',
        value: this.laudos.length,
        meta: `${laudosComClassificacao} com classificação final`,
        icon: 'fa-file-circle-check',
        route: '/laudos-tecnicos',
        visible: this.authService.canAccessLaudos,
      },
      {
        label: 'Usuários',
        value: this.usuarios.length,
        meta: `${activeUsers} usuário(s) ativo(s)`,
        icon: 'fa-users',
        route: '/usuarios',
        visible: this.authService.isAdmin,
      },
      {
        label: 'Unidades',
        value: this.unidades.length,
        meta: `${this.unidadesRaiz} unidade(s) superior(es)`,
        icon: 'fa-sitemap',
        route: '/unidades-administrativas',
        visible: this.authService.isAdmin,
      },
    ].filter((item) => item.visible);
  }

  get itensPorComissao(): DashboardCountCard[] {
    const grouped = new Map<string, number>();

    this.itensInventariados.forEach((item) => {
      const key = item.comissaoAno ? `Comissão ${item.comissaoAno}` : 'Sem comissão';
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

  get transferenciasPorStatus(): DashboardCountCard[] {
    return this.groupByStatus(this.transferencias.map((item) => item.status));
  }

  get laudosPorClassificacao(): DashboardCountCard[] {
    return this.groupByStatus(this.laudos.map((item) => item.classificacaoFinal || 'Sem classificação'));
  }

  get totalItensLevantamento(): number {
    return this.levantamentos.reduce((total, item) => total + item.itens.length, 0);
  }

  get itensLancadosEEstado(): number {
    return this.itensInventariados.filter((item) => item.lancadoEEstado).length;
  }

  get unidadesRaiz(): number {
    return this.unidades.filter((item) => !item.unidadeSuperiorId).length;
  }

  get responsavelCards(): DashboardCountCard[] {
    const grouped = new Map<string, number>();

    this.itensInventariados.forEach((item) => {
      const key = item.localMembrosNomes?.length
        ? item.localMembrosNomes.join(', ')
        : 'Responsáveis não informados';
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
    forkJoin({
      itensInventariados: this.authService.canAccessInventarioConsultas
        ? this.itemInventariadoService.getAll().pipe(catchError(() => of([] as ItemInventariado[])))
        : of([] as ItemInventariado[]),
      comissoes: this.authService.canAccessComissoesConsulta
        ? this.comissaoService.getAll().pipe(catchError(() => of([] as Comissao[])))
        : of([] as Comissao[]),
      levantamentos: this.authService.canManageLevantamentos
        ? this.levantamentoService.getAll().pipe(catchError(() => of([] as Levantamento[])))
        : of([] as Levantamento[]),
      transferencias: this.authService.canAccessGtiGestor
        ? this.transferenciaService.getAll().pipe(catchError(() => of([] as Transferencia[])))
        : of([] as Transferencia[]),
      laudos: this.authService.canAccessLaudos
        ? this.laudoTecnicoService.getAll().pipe(catchError(() => of([] as LaudoTecnico[])))
        : of([] as LaudoTecnico[]),
      usuarios: this.authService.isAdmin
        ? this.authService.getUsers().pipe(catchError(() => of([] as UserSummary[])))
        : of([] as UserSummary[]),
      unidades: this.authService.isAdmin
        ? this.unidadeAdministrativaService.getAll().pipe(catchError(() => of([] as UnidadeAdministrativa[])))
        : of([] as UnidadeAdministrativa[]),
    }).subscribe({
      next: (data) => {
        this.itensInventariados = data.itensInventariados;
        this.comissoes = this.filterAccessibleComissoes(data.comissoes);
        this.levantamentos = data.levantamentos;
        this.transferencias = data.transferencias;
        this.laudos = data.laudos;
        this.usuarios = data.usuarios;
        this.unidades = data.unidades;
        this.loadingStats = false;
      },
      error: () => {
        this.loadingStats = false;
        this.toastr.error('Não foi possível carregar as estatísticas do dashboard.');
      },
    });
  }

  private filterAccessibleComissoes(comissoes: Comissao[]): Comissao[] {
    if (this.authService.isAdmin || this.authService.hasPermission('ControleInterno')) {
      return comissoes;
    }

    const userId = this.authService.session?.userId;
    if (!userId) {
      return [];
    }

    return comissoes.filter((comissao) =>
      comissao.presidenteId === userId || comissao.membros.some((membro) => membro.usuarioId === userId)
    );
  }

  private groupByStatus(values: string[]): DashboardCountCard[] {
    const grouped = new Map<string, number>();

    values.forEach((value) => {
      const key = value?.trim() || 'Sem status';
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

    return [...grouped.entries()]
      .map(([label, value]) => ({
        label,
        value,
        meta: value === 1 ? 'registro' : 'registros',
      }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
