import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { UserSummary } from '../../auth/auth.model';
import { Comissao, ComissaoPayload } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { InconsistenciaInventario, ItemInventariado, ItemInventariadoMovimentacaoLocal } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { Local } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';
import { PageParams } from '../../shared/pagination.model';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

type ComissaoTab = 'resumo' | 'membros' | 'locais' | 'inconsistencias' | 'excluidos' | 'correcoes-local';
type RelatorioComissaoTipo = 'geral' | 'local';

interface LocalMapTile {
  url: string;
  left: number;
  top: number;
}

interface AddressSearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

@Component({
  selector: 'app-comissoes',
  templateUrl: './comissoes.component.html',
  styleUrl: './comissoes.component.scss',
})
export class ComissoesComponent implements OnInit, OnDestroy {
  comissoes: Comissao[] = [];
  usuariosInventario: UserSummary[] = [];
  locais: Local[] = [];
  locaisDaComissaoEmEdicao: Local[] = [];
  selectedMembers: UserSummary[] = [];
  comissaoEmEdicao: Comissao | null = null;
  loading = false;
  loadingUsuarios = false;
  loadingLocais = false;
  loadingComissao = false;
  loadingInconsistencias = false;
  loadingItensInventariados = false;
  loadingItensExcluidos = false;
  loadingMovimentacoesLocal = false;
  saving = false;
  savingMembers = false;
  savingLocal = false;
  readonly changingLocalBlockIds = new Set<string>();
  showModal = false;
  showAddMemberModal = false;
  showLocalModal = false;
  showRelatorioModal = false;
  editingId: string | null = null;
  editingLocalId: string | null = null;
  activeTab: ComissaoTab = 'resumo';
  itensInventariados: ItemInventariado[] = [];
  itensExcluidos: ItemInventariado[] = [];
  movimentacoesLocal: ItemInventariadoMovimentacaoLocal[] = [];
  inconsistenciasInventario: InconsistenciaInventario[] = [];
  relatorioTipo: RelatorioComissaoTipo = 'geral';
  relatorioLocalId = '';
  memberTerm = '';
  memberPageNumber = 1;
  readonly memberPageSize = 10;
  memberTotalCount = 0;
  memberTotalPages = 0;
  memberOptions: Array<{ id: string; nome: string; cpf: string }> = [];
  loadingMemberOptions = false;
  localListTerm = '';
  readonly collapsedLocalIds = new Set<string>();
  localMemberTerm = '';
  localAddressTerm = '';
  localAddressResults: AddressSearchResult[] = [];
  searchingAddress = false;
  localMapTiles: LocalMapTile[] = [];
  localMapZoom = 17;
  localMapCenterLatitude = -8.76077;
  localMapCenterLongitude = -63.89990;
  localMapWidth = 640;
  localMapHeight = 360;
  private localMapDragStart: {
    pointerId: number;
    clientX: number;
    clientY: number;
    centerX: number;
    centerY: number;
    moved: boolean;
  } | null = null;
  private readonly memberSearchChanged$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private collapsedLocalsInitializedForCommissionId: string | null = null;

  form: ComissaoPayload = this.createEmptyForm();
  localForm = {
    nome: '',
    localSuperiorId: null as string | null,
    latitude: null as number | null,
    longitude: null as number | null,
    membroUsuarioIds: [] as string[],
  };

  constructor(
    private readonly comissaoService: ComissaoService,
    readonly authService: AuthService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly localService: LocalService,
    private readonly toastr: ToastrService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.memberSearchChanged$
      .pipe(
        debounceTime(environment.searchDebounceTimeMs),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.memberPageNumber = 1;
        this.loadMemberOptions();
      });

    this.loadUsuarios();
    this.loadLocais();
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.loadComissao(id);
          return;
        }

        this.comissaoEmEdicao = null;
        this.editingId = null;
        this.selectedMembers = [];
        this.syncComissaoCollections();
        this.activeTab = 'resumo';
        this.loadComissoes();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.memberSearchChanged$.complete();
  }

  get activeComissao(): Comissao | null {
    return this.comissoes.find((item) => item.status === 'Ativa') ?? null;
  }

  get isEditPage(): boolean {
    return !!this.editingId;
  }

  get canManageCurrentComissao(): boolean {
    if (!this.editingId) {
      return this.authService.isAdmin;
    }

    const comissao = this.comissaoEmEdicao ?? this.comissoes.find((item) => item.id === this.editingId);
    return !!comissao && this.canEdit(comissao);
  }

  get canEditCurrentComissaoBasics(): boolean {
    return this.authService.isAdmin;
  }

  get percentualProgressoVisual(): number {
    return Math.min(100, Math.max(0, this.comissaoEmEdicao?.percentualProgresso ?? 0));
  }

  loadComissoes(): void {
    if (this.isEditPage) {
      return;
    }

    this.loading = true;
    this.comissaoService.getAll().subscribe({
      next: (data) => {
        this.comissoes = [...data].sort((a, b) => b.ano - a.ano);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar as comissões.');
      },
    });
  }

  loadUsuarios(): void {
    this.loadingUsuarios = true;
    this.authService.getInventarioUsers().subscribe({
      next: (data) => {
        this.usuariosInventario = data
          .map((item) => ({
            ...item,
            email: '',
            status: 'Ativo',
            mustChangePassword: false,
            permissoes: ['Inventario'],
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome));
        this.loadingUsuarios = false;
      },
      error: () => {
        this.loadingUsuarios = false;
        this.toastr.error('Não foi possível carregar os usuários disponíveis para a comissão.');
      },
    });
  }

  loadLocais(): void {
    this.loadingLocais = true;
    this.localService.getAll().subscribe({
      next: (data) => {
        this.locais = data;
        this.syncComissaoCollections();
        this.loadingLocais = false;
      },
      error: () => {
        this.loadingLocais = false;
        this.toastr.error('Não foi possível carregar os locais disponíveis para a comissão.');
      },
    });
  }

  openCreateModal(): void {
    this.editingId = null;
    this.activeTab = 'resumo';
    this.selectedMembers = [];
    this.syncComissaoCollections();
    this.form = this.createEmptyForm();
    this.showModal = true;
  }

  edit(item: Comissao): void {
    if (!this.canEdit(item)) {
      this.toastr.error('Você só pode editar a comissão da qual é presidente.');
      return;
    }

    this.router.navigate(['/comissoes', item.id]);
  }

  view(item: Comissao): void {
    if (!this.canView(item)) {
      return;
    }

    this.router.navigate(['/comissoes', item.id]);
  }

  closeModal(): void {
    this.showModal = false;
    this.showAddMemberModal = false;
    this.showLocalModal = false;
    this.editingId = null;
    this.editingLocalId = null;
    this.activeTab = 'resumo';
    this.saving = false;
    this.savingLocal = false;
    this.localForm = this.createEmptyLocalForm();
    this.localAddressTerm = '';
    this.localAddressResults = [];
    this.selectedMembers = [];
    this.syncComissaoCollections();
    this.form = this.createEmptyForm();
  }

  submit(): void {
    if (!Number.isInteger(Number(this.form.quantidadeItensEsperados)) || Number(this.form.quantidadeItensEsperados) < 0) {
      this.toastr.warning('Informe uma quantidade inteira não negativa para os itens esperados.');
      return;
    }

    const payload: ComissaoPayload = {
      ano: this.canEditCurrentComissaoBasics ? Number(this.form.ano) : this.comissaoEmEdicao?.ano ?? Number(this.form.ano),
      quantidadeItensEsperados: Number(this.form.quantidadeItensEsperados),
      status: this.canEditCurrentComissaoBasics ? this.form.status : this.comissaoEmEdicao?.status ?? this.form.status,
      presidenteId: this.canEditCurrentComissaoBasics ? this.form.presidenteId : this.comissaoEmEdicao?.presidenteId ?? this.form.presidenteId,
      membros: this.form.membros.reduce<Array<{ usuarioId: string }>>((acc, item) => {
        if (!item.usuarioId || acc.some((current) => current.usuarioId === item.usuarioId)) {
          return acc;
        }

        acc.push({
          usuarioId: item.usuarioId,
        });
        return acc;
      }, []),
    };

    this.saving = true;
    const request = this.editingId
      ? this.comissaoService.update(this.editingId, payload)
      : this.comissaoService.create({
        ...payload,
        status: 'Inativa',
        membros: [],
      });

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(this.editingId ? 'Comissão atualizada com sucesso.' : 'Comissão cadastrada com sucesso.');
        const createdNew = !this.editingId;
        if (this.editingId) {
          this.loadComissao(this.editingId, false);
          return;
        }

        this.closeModal();
        this.loadComissoes();
        if (createdNew) {
          this.toastr.info('Agora você já pode editar a comissão para cadastrar membros e locais.');
        }
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar a comissão.');
      },
    });
  }

  toggleMember(usuarioId: string, checked: boolean): void {
    if (checked) {
      if (!this.form.membros.some((item) => item.usuarioId === usuarioId)) {
        this.form.membros = [...this.form.membros, { usuarioId }];
      }
      return;
    }

    this.form.membros = this.form.membros.filter((item) => item.usuarioId !== usuarioId);
    this.localForm.membroUsuarioIds = this.localForm.membroUsuarioIds.filter((id) => id !== usuarioId);
  }

  openAddMemberModal(): void {
    this.showAddMemberModal = true;
    this.memberTerm = '';
    this.memberPageNumber = 1;
    this.loadMemberOptions();
  }

  closeAddMemberModal(): void {
    this.showAddMemberModal = false;
  }

  addMemberFromModal(usuario: { id: string; nome: string; cpf: string }): void {
    if (this.isMemberSelected(usuario.id)) {
      return;
    }

    const nextMembers = [...this.form.membros, { usuarioId: usuario.id }];
    if (!this.editingId) {
      this.form.membros = nextMembers;
      this.syncSelectedMembers();
      return;
    }

    this.updateComissaoMembers(nextMembers, () => {
      if (this.comissaoEmEdicao && !this.comissaoEmEdicao.membros.some((item) => item.usuarioId === usuario.id)) {
        this.comissaoEmEdicao = {
          ...this.comissaoEmEdicao,
          membros: [...this.comissaoEmEdicao.membros, {
            usuarioId: usuario.id,
            nome: usuario.nome,
            cpf: usuario.cpf,
          }],
        };
      }

      this.toastr.success('Membro adicionado com sucesso.');
      this.syncSelectedMembers();
    });
  }

  isMemberSelected(usuarioId: string): boolean {
    return this.form.membros.some((item) => item.usuarioId === usuarioId);
  }

  removeMember(usuarioId: string): void {
    const nextMembers = this.form.membros.filter((item) => item.usuarioId !== usuarioId);
    if (!this.editingId) {
      this.form.membros = nextMembers;
      this.localForm.membroUsuarioIds = this.localForm.membroUsuarioIds.filter((id) => id !== usuarioId);
      this.syncSelectedMembers();
      return;
    }

    this.updateComissaoMembers(nextMembers, () => {
      this.localForm.membroUsuarioIds = this.localForm.membroUsuarioIds.filter((id) => id !== usuarioId);
      if (this.comissaoEmEdicao) {
        this.comissaoEmEdicao = {
          ...this.comissaoEmEdicao,
          membros: this.comissaoEmEdicao.membros.filter((item) => item.usuarioId !== usuarioId),
        };
      }

      this.toastr.success('Membro removido com sucesso.');
      this.syncSelectedMembers();
    });
  }

  startLocalCreate(): void {
    this.editingLocalId = null;
    this.localMemberTerm = '';
    this.localForm = {
      nome: '',
      localSuperiorId: null,
      latitude: null,
      longitude: null,
      membroUsuarioIds: [],
    };
    this.localAddressTerm = '';
    this.localAddressResults = [];
    this.centerLocalMap(this.localMapCenterLatitude, this.localMapCenterLongitude);
    this.showLocalModal = true;
  }

  startLocalEdit(item: Local): void {
    this.editingLocalId = item.id;
    this.localMemberTerm = '';
    this.localForm = {
      nome: item.nome,
      localSuperiorId: item.localSuperiorId ?? null,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      membroUsuarioIds: item.membros.map((membro) => membro.usuarioId),
    };
    this.localAddressTerm = '';
    this.localAddressResults = [];
    this.centerLocalMap(item.latitude ?? this.localMapCenterLatitude, item.longitude ?? this.localMapCenterLongitude);
    this.showLocalModal = true;
  }

  cancelLocalEdit(): void {
    this.editingLocalId = null;
    this.showLocalModal = false;
    this.localMemberTerm = '';
    this.localAddressTerm = '';
    this.localAddressResults = [];
    this.localForm = this.createEmptyLocalForm();
  }

  submitLocal(): void {
    if (!this.editingId) {
      this.toastr.info('Salve a comissão primeiro para liberar o cadastro de locais.');
      return;
    }

    if (!this.canManageCurrentComissao) {
      this.toastr.error('Você não pode gerenciar locais desta comissão.');
      return;
    }

    const nome = this.localForm.nome.trim();
    if (!nome) {
      this.toastr.warning('Informe o nome do local.');
      return;
    }

    this.savingLocal = true;
    const payload = {
      nome,
      comissaoId: this.editingId,
      localSuperiorId: this.localForm.localSuperiorId,
      latitude: this.localForm.latitude,
      longitude: this.localForm.longitude,
      membroUsuarioIds: [...new Set(this.localForm.membroUsuarioIds)],
    };

    const request = this.editingLocalId
      ? this.localService.update(this.editingLocalId, payload)
      : this.localService.create(payload);

    request.subscribe({
      next: () => {
        this.savingLocal = false;
        this.toastr.success(this.editingLocalId ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.');
        this.cancelLocalEdit();
        this.loadLocais();
      },
      error: (error) => {
        this.savingLocal = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar o local.');
      },
    });
  }

  toggleLocalBloqueio(item: Local): void {
    if (!this.canManageCurrentComissao || this.changingLocalBlockIds.has(item.id)) {
      return;
    }

    const bloqueado = !item.bloqueado;
    this.changingLocalBlockIds.add(item.id);
    this.localService.setBloqueio(item.id, bloqueado).subscribe({
      next: (updated) => {
        const index = this.locais.findIndex((local) => local.id === updated.id);
        if (index >= 0) {
          this.locais[index] = updated;
        }
        this.syncComissaoCollections();
        this.changingLocalBlockIds.delete(item.id);
        this.toastr.success(bloqueado
          ? 'Local bloqueado temporariamente para inventário.'
          : 'Local desbloqueado para inventário.');
      },
      error: (error) => {
        this.changingLocalBlockIds.delete(item.id);
        this.toastr.error(error?.error?.message ?? 'Não foi possível alterar o bloqueio do local.');
      },
    });
  }

  getPresidenteNome(presidenteId: string): string {
    return this.usuariosInventario.find((item) => item.id === presidenteId)?.nome ?? '-';
  }

  setActiveTab(tab: ComissaoTab): void {
    this.activeTab = tab;
    if (tab === 'resumo') {
      this.loadItensInventariadosComissao();
      this.loadInconsistenciasInventario();
    } else if (tab === 'inconsistencias') {
      this.loadInconsistenciasInventario();
    } else if (tab === 'excluidos') {
      this.loadItensExcluidosComissao();
    } else if (tab === 'correcoes-local') {
      this.loadMovimentacoesLocal();
    }
  }

  loadMovimentacoesLocal(): void {
    if (!this.editingId) {
      return;
    }

    this.loadingMovimentacoesLocal = true;
    this.itemInventariadoService.getLocalMovements().subscribe({
      next: (data) => {
        this.movimentacoesLocal = data;
        this.loadingMovimentacoesLocal = false;
      },
      error: () => {
        this.loadingMovimentacoesLocal = false;
        this.toastr.error('Não foi possível carregar o histórico de correções de local.');
      },
    });
  }

  loadItensExcluidosComissao(): void {
    if (!this.editingId) {
      return;
    }

    this.loadingItensExcluidos = true;
    this.itemInventariadoService.getDeleted().subscribe({
      next: (data) => {
        this.itensExcluidos = data;
        this.loadingItensExcluidos = false;
      },
      error: () => {
        this.loadingItensExcluidos = false;
        this.toastr.error('Não foi possível carregar os itens excluídos desta comissão.');
      },
    });
  }

  loadItensInventariadosComissao(): void {
    if (!this.editingId) {
      return;
    }

    this.loadingItensInventariados = true;
    this.itemInventariadoService.getAll().subscribe({
      next: (data) => {
        this.itensInventariados = data;
        this.loadingItensInventariados = false;
      },
      error: () => {
        this.loadingItensInventariados = false;
        this.toastr.error('Não foi possível carregar os itens inventariados desta comissão.');
      },
    });
  }

  loadInconsistenciasInventario(): void {
    if (!this.editingId) {
      return;
    }

    this.loadingInconsistencias = true;
    this.itemInventariadoService.getInconsistencias().subscribe({
      next: (data) => {
        this.inconsistenciasInventario = data;
        this.loadingInconsistencias = false;
      },
      error: () => {
        this.loadingInconsistencias = false;
        this.toastr.error('Não foi possível carregar as inconsistências desta comissão.');
      },
    });
  }

  get inconsistenciasDaComissao(): InconsistenciaInventario[] {
    return this.inconsistenciasInventario.filter((item) => item.comissaoId === this.editingId);
  }

  get itensInventariadosDaComissao(): ItemInventariado[] {
    return this.itensInventariados.filter((item) => item.comissaoId === this.editingId);
  }

  get itensExcluidosDaComissao(): ItemInventariado[] {
    return this.itensExcluidos.filter((item) => item.comissaoId === this.editingId);
  }

  get movimentacoesLocalDaComissao(): ItemInventariadoMovimentacaoLocal[] {
    return this.movimentacoesLocal.filter((item) => item.comissaoId === this.editingId);
  }

  get totalOcorrenciasInconsistencias(): number {
    return this.inconsistenciasDaComissao.reduce((total, item) => total + item.quantidadeOcorrencias, 0);
  }

  get relatorioLocalOptions(): SearchableSelectOption[] {
    return this.locaisDaComissaoEmEdicao
      .map((local) => ({ value: local.id, label: this.getLocalHierarchyLabel(local) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  gerarRelatorioComissao(): void {
    if (!this.comissaoEmEdicao) {
      return;
    }

    if (this.itensInventariadosDaComissao.length === 0) {
      this.toastr.info('Esta comissão ainda não possui itens inventariados para o relatório.');
      return;
    }

    this.relatorioTipo = 'geral';
    this.relatorioLocalId = '';
    this.showRelatorioModal = true;
  }

  fecharRelatorioModal(): void {
    this.showRelatorioModal = false;
  }

  confirmarRelatorioComissao(): void {
    if (!this.comissaoEmEdicao) {
      return;
    }

    if (this.relatorioTipo === 'local' && !this.relatorioLocalId) {
      this.toastr.warning('Selecione o local que deseja incluir no relatório.');
      return;
    }

    const itens = this.relatorioTipo === 'local'
      ? this.itensInventariadosDaComissao.filter((item) => item.localId === this.relatorioLocalId)
      : this.itensInventariadosDaComissao;
    if (itens.length === 0) {
      this.toastr.info('O local selecionado ainda não possui itens inventariados para o relatório.');
      return;
    }

    const dataGeracao = new Date();
    const locaisPorId = new Map(this.locaisDaComissaoEmEdicao.map((local) => [local.id, local]));
    const itensPorLocal = new Map<string, ItemInventariado[]>();

    itens.forEach((item) => {
      const chave = item.localId || 'sem-local';
      const itensDoLocal = itensPorLocal.get(chave) ?? [];
      itensDoLocal.push(item);
      itensPorLocal.set(chave, itensDoLocal);
    });

    const grupos = [...itensPorLocal.entries()]
      .map(([localId, itensDoLocal]) => ({
        localNome: locaisPorId.get(localId)?.nome || itensDoLocal[0]?.localNome || 'Local não informado',
        itens: [...itensDoLocal].sort((a, b) =>
          (a.tombamentoNovo || a.descricao).localeCompare(b.tombamentoNovo || b.descricao)
        ),
      }))
      .sort((a, b) => a.localNome.localeCompare(b.localNome));

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Relatório da Comissão de Inventário', margin, 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Comissão ${this.comissaoEmEdicao.ano} | Presidente: ${this.comissaoEmEdicao.presidenteNome || '-'}`, margin, 20);
    pdf.text(`Gerado em: ${dataGeracao.toLocaleString('pt-BR')}`, margin, 25);
    pdf.text(
      `Locais com inventário: ${grupos.length} | Registros coletados: ${itens.length} | Itens únicos: ${this.comissaoEmEdicao.quantidadeItensLocalizados} | Esperados: ${this.comissaoEmEdicao.quantidadeItensEsperados}`,
      margin,
      30
    );

    let startY = 37;
    grupos.forEach((grupo, index) => {
      if (index > 0) {
        pdf.addPage();
        startY = 14;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`${grupo.localNome} (${grupo.itens.length} item(ns))`, margin, startY);

      autoTable(pdf, {
        startY: startY + 3,
        margin: { left: margin, right: margin, top: 12, bottom: 10 },
        head: [[
          'Tombamento novo',
          'Tombamento antigo',
          'Descrição',
          'Classificação',
          'Conservação',
          'Detalhes coletados',
          'Inventariado por',
          'Data',
          'E-Estado',
        ]],
        body: grupo.itens.map((item) => [
          item.tombamentoNovo || '-',
          item.tombamentoAntigo || '-',
          item.descricao || '-',
          item.status || '-',
          item.estadoConservacao || '-',
          [
            item.justificativaInservivel ? `Justificativa: ${item.justificativaInservivel}` : '',
            item.observacao ? `Observação: ${item.observacao}` : '',
            item.latitude !== null && item.latitude !== undefined && item.longitude !== null && item.longitude !== undefined
              ? `Localização: ${item.latitude}, ${item.longitude}${item.precisaoLocalizacao ? ` (precisão ${item.precisaoLocalizacao} m)` : ''}`
              : '',
            `Fotos: ${item.fotos.length}`,
          ].filter(Boolean).join(' | '),
          item.usuarioNome || '-',
          this.formatReportDate(item.dataInventario),
          item.lancadoEEstado
            ? `Lançado${item.lancadoEEstadoPorUsuarioNome ? ` por ${item.lancadoEEstadoPorUsuarioNome}` : ''}${item.lancadoEEstadoEm ? ` em ${this.formatReportDate(item.lancadoEEstadoEm)}` : ''}`
            : 'Pendente',
        ]),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1.4, valign: 'top', overflow: 'linebreak' },
        headStyles: { fillColor: [41, 95, 150], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [244, 247, 250] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 48 },
          3: { cellWidth: 22 },
          4: { cellWidth: 22 },
          5: { cellWidth: 55 },
          6: { cellWidth: 30 },
          7: { cellWidth: 24 },
          8: { cellWidth: 17 },
        },
        didDrawPage: () => {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.text(
            `Comissão ${this.comissaoEmEdicao!.ano} — página ${pdf.getNumberOfPages()}`,
            pageWidth - margin,
            pageHeight - 5,
            { align: 'right' }
          );
        },
      });

      const finalY = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
      startY = finalY;
    });

    const localSelecionado = this.relatorioTipo === 'local'
      ? this.locaisDaComissaoEmEdicao.find((local) => local.id === this.relatorioLocalId)
      : null;
    const sufixoLocal = localSelecionado ? `-${this.formatFileName(localSelecionado.nome)}` : '';

    pdf.save(`relatorio-comissao-${this.comissaoEmEdicao.ano}${sufixoLocal}-${this.formatFileDateTime(dataGeracao)}.pdf`);
    this.fecharRelatorioModal();
    this.toastr.success('Relatório da comissão gerado com sucesso.');
  }

  private formatFileName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  getInconsistenciaLocaisLabel(inconsistencia: InconsistenciaInventario): string {
    const locais = [...new Set(inconsistencia.ocorrencias.map((item) => item.localNome).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));

    return locais.length ? locais.join(', ') : '-';
  }

  get filteredLocalMembers(): UserSummary[] {
    const term = this.localMemberTerm.trim().toLowerCase();
    if (!term) {
      return this.selectedMembers;
    }

    return this.selectedMembers.filter((usuario) =>
      usuario.nome.toLowerCase().includes(term)
      || usuario.cpf.toLowerCase().includes(term)
    );
  }

  isLocalMemberSelected(usuarioId: string): boolean {
    return this.localForm.membroUsuarioIds.includes(usuarioId);
  }

  toggleLocalMember(usuarioId: string, checked: boolean): void {
    if (checked) {
      if (!this.isLocalMemberSelected(usuarioId)) {
        this.localForm.membroUsuarioIds = [...this.localForm.membroUsuarioIds, usuarioId];
      }
      return;
    }

    this.localForm.membroUsuarioIds = this.localForm.membroUsuarioIds.filter((id) => id !== usuarioId);
  }

  getLocalMembrosLabel(local: Local): string {
    const nomes = local.membros
      .map((membro) => membro.nome)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return nomes.length > 0 ? nomes.join(', ') : 'Nenhum responsável informado';
  }

  get locaisVisiveis(): Local[] {
    const term = this.normalizeLocalSearchTerm(this.localListTerm);
    const locaisPorId = new Map(this.locaisDaComissaoEmEdicao.map((item) => [item.id, item]));
    let idsIncluidos: Set<string> | null = null;

    if (term) {
      idsIncluidos = new Set<string>();

      this.locaisDaComissaoEmEdicao.forEach((local) => {
        const textoLocal = this.normalizeLocalSearchTerm([
          local.nome,
          local.localSuperiorNome,
          ...local.membros.map((membro) => membro.nome),
        ].join(' '));

        if (!textoLocal.includes(term)) {
          return;
        }

        let localAtual: Local | undefined = local;
        const visitados = new Set<string>();
        while (localAtual && !visitados.has(localAtual.id)) {
          visitados.add(localAtual.id);
          idsIncluidos!.add(localAtual.id);
          localAtual = localAtual.localSuperiorId
            ? locaisPorId.get(localAtual.localSuperiorId)
            : undefined;
        }
      });
    }

    return this.locaisDaComissaoEmEdicao.filter((local) => {
      if (idsIncluidos && !idsIncluidos.has(local.id)) {
        return false;
      }

      if (term) {
        return true;
      }

      let localSuperiorId = local.localSuperiorId;
      const visitados = new Set<string>();
      while (localSuperiorId && !visitados.has(localSuperiorId)) {
        visitados.add(localSuperiorId);
        if (this.collapsedLocalIds.has(localSuperiorId)) {
          return false;
        }
        localSuperiorId = locaisPorId.get(localSuperiorId)?.localSuperiorId;
      }

      return true;
    });
  }

  onLocalListTermChange(value: string): void {
    this.localListTerm = value;
  }

  hasLocalChildren(local: Local): boolean {
    return this.locaisDaComissaoEmEdicao.some((item) => item.localSuperiorId === local.id);
  }

  isLocalCollapsed(local: Local): boolean {
    return this.collapsedLocalIds.has(local.id);
  }

  toggleLocalCollapsed(local: Local): void {
    if (this.collapsedLocalIds.has(local.id)) {
      this.collapsedLocalIds.delete(local.id);
    } else {
      this.collapsedLocalIds.add(local.id);
    }
  }

  collapseAllLocals(): void {
    this.locaisDaComissaoEmEdicao
      .filter((local) => this.hasLocalChildren(local))
      .forEach((local) => this.collapsedLocalIds.add(local.id));
  }

  expandAllLocals(): void {
    this.collapsedLocalIds.clear();
  }

  getLocalGeolocalizacaoLabel(local: Local): string {
    return this.hasLocalGeolocalizacao(local)
      ? `${local.latitude!.toFixed(6)}, ${local.longitude!.toFixed(6)}`
      : 'Localização não definida';
  }

  hasLocalGeolocalizacao(local: Local): boolean {
    return local.latitude !== null
      && local.latitude !== undefined
      && local.longitude !== null
      && local.longitude !== undefined;
  }

  get localFormHasGeolocalizacao(): boolean {
    return this.localForm.latitude !== null
      && this.localForm.latitude !== undefined
      && this.localForm.longitude !== null
      && this.localForm.longitude !== undefined;
  }

  get localFormGeolocalizacaoLabel(): string {
    return this.localFormHasGeolocalizacao
      ? `${this.localForm.latitude!.toFixed(6)}, ${this.localForm.longitude!.toFixed(6)}`
      : 'Clique no mapa ou pesquise um endereço para posicionar o local.';
  }

  get localSuperiorOptions(): SearchableSelectOption[] {
    const idsIndisponiveis = this.getUnavailableLocalSuperiorIds();
    const locaisDisponiveis = this.locaisDaComissaoEmEdicao
      .filter((item) => !idsIndisponiveis.has(item.id));
    const idsDisponiveis = new Set(locaisDisponiveis.map((item) => item.id));
    const locaisPorSuperior = new Map<string | null, Local[]>();

    locaisDisponiveis.forEach((local) => {
      const superiorId = local.localSuperiorId && idsDisponiveis.has(local.localSuperiorId)
        ? local.localSuperiorId
        : null;
      const subordinados = locaisPorSuperior.get(superiorId) ?? [];
      subordinados.push(local);
      locaisPorSuperior.set(superiorId, subordinados);
    });

    locaisPorSuperior.forEach((locais) => locais.sort((a, b) => a.nome.localeCompare(b.nome)));

    const options: SearchableSelectOption[] = [];
    const adicionarOptions = (superiorId: string | null, depth: number): void => {
      (locaisPorSuperior.get(superiorId) ?? []).forEach((local) => {
        options.push({ value: local.id, label: this.getLocalHierarchyLabel(local), depth });
        adicionarOptions(local.id, depth + 1);
      });
    };

    adicionarOptions(null, 0);
    return options;
  }

  getLocalHierarchyLabel(local: Local): string {
    const locaisPorId = new Map(this.locaisDaComissaoEmEdicao.map((item) => [item.id, item]));
    const caminho = [local.nome];
    const visitados = new Set<string>([local.id]);
    let localSuperiorId = local.localSuperiorId;

    while (localSuperiorId && locaisPorId.has(localSuperiorId) && !visitados.has(localSuperiorId)) {
      const localSuperior = locaisPorId.get(localSuperiorId)!;
      caminho.unshift(localSuperior.nome);
      visitados.add(localSuperiorId);
      localSuperiorId = localSuperior.localSuperiorId;
    }

    return caminho.join(' > ');
  }

  getLocalDepth(local: Local): number {
    const locaisPorId = new Map(this.locaisDaComissaoEmEdicao.map((item) => [item.id, item]));
    const visitados = new Set<string>();
    let depth = 0;
    let localSuperiorId = local.localSuperiorId;

    while (localSuperiorId && locaisPorId.has(localSuperiorId) && !visitados.has(localSuperiorId)) {
      visitados.add(localSuperiorId);
      depth += 1;
      localSuperiorId = locaisPorId.get(localSuperiorId)?.localSuperiorId;
    }

    return depth;
  }

  private normalizeLocalSearchTerm(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private getUnavailableLocalSuperiorIds(): Set<string> {
    const idsIndisponiveis = new Set<string>();
    if (!this.editingLocalId) {
      return idsIndisponiveis;
    }

    const locaisPorSuperior = new Map<string, Local[]>();
    this.locaisDaComissaoEmEdicao.forEach((local) => {
      if (!local.localSuperiorId) {
        return;
      }

      const subordinados = locaisPorSuperior.get(local.localSuperiorId) ?? [];
      subordinados.push(local);
      locaisPorSuperior.set(local.localSuperiorId, subordinados);
    });

    const adicionarIndisponiveis = (localId: string): void => {
      if (idsIndisponiveis.has(localId)) {
        return;
      }

      idsIndisponiveis.add(localId);
      (locaisPorSuperior.get(localId) ?? []).forEach((local) => adicionarIndisponiveis(local.id));
    };

    adicionarIndisponiveis(this.editingLocalId);
    return idsIndisponiveis;
  }

  searchLocalAddress(): void {
    const term = this.localAddressTerm.trim();
    if (!term) {
      this.toastr.warning('Informe um endereço para pesquisar.');
      return;
    }

    this.searchingAddress = true;
    this.localAddressResults = [];

    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(term)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha na busca de endereço.');
        }

        return response.json() as Promise<AddressSearchResult[]>;
      })
      .then((results) => {
        this.searchingAddress = false;
        this.localAddressResults = results;
        if (results.length === 0) {
          this.toastr.info('Nenhum endereço encontrado.');
        }
      })
      .catch(() => {
        this.searchingAddress = false;
        this.toastr.error('Não foi possível pesquisar o endereço.');
      });
  }

  selectLocalAddress(result: AddressSearchResult): void {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.toastr.warning('O endereço selecionado não possui coordenadas válidas.');
      return;
    }

    this.localAddressTerm = result.display_name;
    this.localAddressResults = [];
    this.setLocalCoordinates(latitude, longitude);
  }

  setLocalFromMap(event: MouseEvent): void {
    if (this.localMapDragStart?.moved) {
      return;
    }

    const eventTarget = event.target as HTMLElement;
    if (eventTarget.closest('a')) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.updateLocalMapSize(rect);

    const centerPixel = this.projectToPixel(this.localMapCenterLatitude, this.localMapCenterLongitude, this.localMapZoom);
    const clickedX = centerPixel.x + event.clientX - rect.left - this.localMapWidth / 2;
    const clickedY = centerPixel.y + event.clientY - rect.top - this.localMapHeight / 2;
    const coordinates = this.unprojectPixel(clickedX, clickedY, this.localMapZoom);

    this.setLocalCoordinates(coordinates.latitude, coordinates.longitude);
  }

  beginLocalMapDrag(event: PointerEvent): void {
    if (!this.canManageCurrentComissao || event.button !== 0) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.updateLocalMapSize(rect);

    const centerPixel = this.projectToPixel(this.localMapCenterLatitude, this.localMapCenterLongitude, this.localMapZoom);
    this.localMapDragStart = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      centerX: centerPixel.x,
      centerY: centerPixel.y,
      moved: false,
    };

    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  dragLocalMap(event: PointerEvent): void {
    if (!this.localMapDragStart || this.localMapDragStart.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.localMapDragStart.clientX;
    const deltaY = event.clientY - this.localMapDragStart.clientY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.localMapDragStart.moved = true;
    }

    const coordinates = this.unprojectPixel(
      this.localMapDragStart.centerX - deltaX,
      this.localMapDragStart.centerY - deltaY,
      this.localMapZoom
    );

    this.localForm = {
      ...this.localForm,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
    this.localMapCenterLatitude = coordinates.latitude;
    this.localMapCenterLongitude = coordinates.longitude;
    this.localMapTiles = this.buildLocalMapTiles();
    event.preventDefault();
  }

  endLocalMapDrag(event: PointerEvent): void {
    if (!this.localMapDragStart || this.localMapDragStart.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    setTimeout(() => {
      this.localMapDragStart = null;
    });
  }

  clearLocalCoordinates(): void {
    this.localForm = {
      ...this.localForm,
      latitude: null,
      longitude: null,
    };
  }

  getLocalMarkerLeft(): number {
    return 50;
  }

  getLocalMarkerTop(): number {
    return 50;
  }

  getLocalMembersSelectedCount(): number {
    return this.localForm.membroUsuarioIds.length;
  }

  onMemberTermChange(value: string): void {
    this.memberTerm = value;
    this.memberSearchChanged$.next(this.memberTerm.trim());
  }

  goToPreviousMemberPage(): void {
    if (this.memberPageNumber <= 1 || this.loadingMemberOptions) {
      return;
    }

    this.memberPageNumber -= 1;
    this.loadMemberOptions();
  }

  goToNextMemberPage(): void {
    if (this.memberPageNumber >= this.memberTotalPages || this.loadingMemberOptions) {
      return;
    }

    this.memberPageNumber += 1;
    this.loadMemberOptions();
  }

  get memberPageLabel(): string {
    if (this.memberTotalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.memberPageNumber} de ${this.memberTotalPages}`;
  }

  canEdit(item: Comissao): boolean {
    return this.authService.isAdmin || this.authService.session?.userId === item.presidenteId;
  }

  canView(item: Comissao): boolean {
    return this.authService.canAccessComissoesConsulta || this.canEdit(item);
  }

  goBackToList(): void {
    this.router.navigate(['/comissoes']);
  }

  private updateComissaoMembers(nextMembers: Array<{ usuarioId: string }>, onSuccess: () => void): void {
    if (!this.editingId) {
      return;
    }

    const payload: ComissaoPayload = {
      ano: this.comissaoEmEdicao?.ano ?? Number(this.form.ano),
      quantidadeItensEsperados: Number(this.form.quantidadeItensEsperados),
      status: this.comissaoEmEdicao?.status ?? this.form.status,
      presidenteId: this.comissaoEmEdicao?.presidenteId ?? this.form.presidenteId,
      membros: nextMembers.reduce<Array<{ usuarioId: string }>>((acc, item) => {
        if (!item.usuarioId || acc.some((current) => current.usuarioId === item.usuarioId)) {
          return acc;
        }

        acc.push({ usuarioId: item.usuarioId });
        return acc;
      }, []),
    };

    this.savingMembers = true;
    this.comissaoService.update(this.editingId, payload).subscribe({
      next: () => {
        this.form.membros = payload.membros;
        this.savingMembers = false;
        onSuccess();
      },
      error: (error) => {
        this.savingMembers = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível salvar os membros da comissão.');
      },
    });
  }

  private loadComissao(id: string, showErrors = true): void {
    this.loadingComissao = true;
    this.comissaoService.getById(id).subscribe({
      next: (item) => {
        this.comissaoEmEdicao = item;
        this.editingId = item.id;
        this.editingLocalId = null;
        this.syncComissaoCollections();
        this.form = {
          ano: item.ano,
          quantidadeItensEsperados: item.quantidadeItensEsperados,
          status: item.status,
          presidenteId: item.presidenteId,
          membros: item.membros.map((membro) => ({
            usuarioId: membro.usuarioId,
          })),
        };
        this.syncSelectedMembers();
        this.loadingComissao = false;
        this.loadItensInventariadosComissao();
        this.loadInconsistenciasInventario();
      },
      error: () => {
        this.loadingComissao = false;
        if (showErrors) {
          this.toastr.error('Não foi possível carregar a comissão.');
          this.router.navigate(['/comissoes']);
        }
      },
    });
  }

  private loadMemberOptions(): void {
    this.loadingMemberOptions = true;
    const params: PageParams = {
      pageNumber: this.memberPageNumber,
      pageSize: this.memberPageSize,
      term: this.memberTerm.trim(),
    };

    this.authService.getPagedInventarioUsers(params).subscribe({
      next: (data) => {
        this.memberOptions = data.items;
        this.memberPageNumber = data.pageNumber;
        this.memberTotalCount = data.totalCount;
        this.memberTotalPages = data.totalPages;
        this.loadingMemberOptions = false;
      },
      error: () => {
        this.loadingMemberOptions = false;
        this.toastr.error('Não foi possível carregar os usuários para adicionar na comissão.');
      },
    });
  }

  private createEmptyForm(): ComissaoPayload {
    return {
      ano: new Date().getFullYear(),
      quantidadeItensEsperados: 0,
      status: 'Inativa',
      presidenteId: '',
      membros: [],
    };
  }

  private formatReportDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
  }

  private formatFileDateTime(date: Date): string {
    const pad = (value: number): string => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  }

  private createEmptyLocalForm(): { nome: string; localSuperiorId: string | null; latitude: number | null; longitude: number | null; membroUsuarioIds: string[] } {
    return {
      nome: '',
      localSuperiorId: null,
      latitude: null,
      longitude: null,
      membroUsuarioIds: [],
    };
  }

  private syncComissaoCollections(): void {
    if (!this.editingId) {
      this.locaisDaComissaoEmEdicao = [];
      return;
    }

    const locaisDaComissao = this.locais.filter((item) => item.comissaoId === this.editingId);
    const locaisPorSuperior = new Map<string | null, Local[]>();
    const ids = new Set(locaisDaComissao.map((item) => item.id));

    locaisDaComissao.forEach((local) => {
      const localSuperiorId = local.localSuperiorId && ids.has(local.localSuperiorId)
        ? local.localSuperiorId
        : null;
      const locaisSubordinados = locaisPorSuperior.get(localSuperiorId) ?? [];
      locaisSubordinados.push(local);
      locaisPorSuperior.set(localSuperiorId, locaisSubordinados);
    });

    locaisPorSuperior.forEach((locais) => locais.sort((a, b) => a.nome.localeCompare(b.nome)));

    const locaisOrdenados: Local[] = [];
    const adicionados = new Set<string>();
    const adicionarLocal = (local: Local): void => {
      if (adicionados.has(local.id)) {
        return;
      }

      adicionados.add(local.id);
      locaisOrdenados.push(local);
      (locaisPorSuperior.get(local.id) ?? []).forEach(adicionarLocal);
    };

    (locaisPorSuperior.get(null) ?? []).forEach(adicionarLocal);
    locaisDaComissao.forEach(adicionarLocal);
    this.locaisDaComissaoEmEdicao = locaisOrdenados;

    if (locaisOrdenados.length > 0 && this.collapsedLocalsInitializedForCommissionId !== this.editingId) {
      this.collapsedLocalIds.clear();
      locaisOrdenados
        .filter((local) => (locaisPorSuperior.get(local.id) ?? []).length > 0)
        .forEach((local) => this.collapsedLocalIds.add(local.id));
      this.collapsedLocalsInitializedForCommissionId = this.editingId;
    }

    this.collapsedLocalIds.forEach((id) => {
      if (!ids.has(id)) {
        this.collapsedLocalIds.delete(id);
      }
    });
  }

  private syncSelectedMembers(): void {
    if (!this.comissaoEmEdicao) {
      this.selectedMembers = [];
      return;
    }

    this.selectedMembers = this.comissaoEmEdicao.membros
      .filter((usuario) => this.form.membros.some((membro) => membro.usuarioId === usuario.usuarioId))
      .map((usuario) => ({
        id: usuario.usuarioId,
        nome: usuario.nome,
        cpf: usuario.cpf,
        email: '',
        status: 'Ativo',
        mustChangePassword: false,
        permissoes: ['Inventario'],
      }));
  }

  private setLocalCoordinates(latitude: number, longitude: number): void {
    this.localForm = {
      ...this.localForm,
      latitude,
      longitude,
    };
    this.centerLocalMap(latitude, longitude);
  }

  private centerLocalMap(latitude: number, longitude: number): void {
    this.localMapCenterLatitude = latitude;
    this.localMapCenterLongitude = longitude;
    this.localMapTiles = this.buildLocalMapTiles();
  }

  private buildLocalMapTiles(): LocalMapTile[] {
    const centerPixel = this.projectToPixel(this.localMapCenterLatitude, this.localMapCenterLongitude, this.localMapZoom);
    const centerTileX = Math.floor(centerPixel.x / 256);
    const centerTileY = Math.floor(centerPixel.y / 256);
    const maxTile = 2 ** this.localMapZoom;
    const tiles: LocalMapTile[] = [];

    for (let row = -2; row <= 2; row += 1) {
      for (let col = -2; col <= 2; col += 1) {
        const tileX = centerTileX + col;
        const tileY = centerTileY + row;
        if (tileY < 0 || tileY >= maxTile) {
          continue;
        }

        const wrappedTileX = ((tileX % maxTile) + maxTile) % maxTile;
        tiles.push({
          url: `https://tile.openstreetmap.org/${this.localMapZoom}/${wrappedTileX}/${tileY}.png`,
          left: this.localMapWidth / 2 + tileX * 256 - centerPixel.x,
          top: this.localMapHeight / 2 + tileY * 256 - centerPixel.y,
        });
      }
    }

    return tiles;
  }

  private updateLocalMapSize(rect: DOMRect): void {
    this.localMapWidth = rect.width || this.localMapWidth;
    this.localMapHeight = rect.height || this.localMapHeight;
  }

  private projectToTile(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
    const scale = 2 ** zoom;
    const sinLatitude = Math.sin(latitude * Math.PI / 180);

    return {
      x: scale * ((longitude + 180) / 360),
      y: scale * (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)),
    };
  }

  private projectToPixel(latitude: number, longitude: number, zoom: number): { x: number; y: number } {
    const tile = this.projectToTile(latitude, longitude, zoom);

    return {
      x: tile.x * 256,
      y: tile.y * 256,
    };
  }

  private unprojectPixel(x: number, y: number, zoom: number): { latitude: number; longitude: number } {
    const scale = 2 ** zoom;
    const longitude = x / 256 / scale * 360 - 180;
    const latitudeRadians = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / 256 / scale)));

    return {
      latitude: latitudeRadians * 180 / Math.PI,
      longitude,
    };
  }
}
