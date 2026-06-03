import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { UserSummary } from '../../auth/auth.model';
import { Comissao, ComissaoPayload } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { Local } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';
import { PageParams } from '../../shared/pagination.model';

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
  saving = false;
  savingLocal = false;
  showModal = false;
  showAddMemberModal = false;
  showLocalModal = false;
  editingId: string | null = null;
  editingLocalId: string | null = null;
  activeTab: 'dados' | 'membros' | 'locais' = 'dados';
  memberTerm = '';
  memberPageNumber = 1;
  readonly memberPageSize = 10;
  memberTotalCount = 0;
  memberTotalPages = 0;
  memberOptions: Array<{ id: string; nome: string; cpf: string }> = [];
  loadingMemberOptions = false;
  localMemberTerm = '';
  private readonly memberSearchChanged$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  form: ComissaoPayload = this.createEmptyForm();
  localForm = {
    nome: '',
    membroUsuarioIds: [] as string[],
  };

  constructor(
    private readonly comissaoService: ComissaoService,
    readonly authService: AuthService,
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
        this.activeTab = 'dados';
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
    this.activeTab = 'dados';
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

  closeModal(): void {
    this.showModal = false;
    this.showAddMemberModal = false;
    this.showLocalModal = false;
    this.editingId = null;
    this.editingLocalId = null;
    this.activeTab = 'dados';
    this.saving = false;
    this.savingLocal = false;
    this.localForm = { nome: '', membroUsuarioIds: [] };
    this.selectedMembers = [];
    this.syncComissaoCollections();
    this.form = this.createEmptyForm();
  }

  submit(): void {
    const payload: ComissaoPayload = {
      ano: this.canEditCurrentComissaoBasics ? Number(this.form.ano) : this.comissaoEmEdicao?.ano ?? Number(this.form.ano),
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

  remove(item: Comissao): void {
    if (!this.authService.isAdmin) {
      this.toastr.error('Somente administradores podem excluir comissões.');
      return;
    }

    if (!confirm(`Deseja excluir a comissão ${item.ano}?`)) {
      return;
    }

    this.comissaoService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Comissão excluída com sucesso.');
        this.loadComissoes();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir a comissão.');
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
    if (!this.isMemberSelected(usuario.id)) {
      this.form.membros = [...this.form.membros, { usuarioId: usuario.id }];
    }

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

    this.syncSelectedMembers();
  }

  isMemberSelected(usuarioId: string): boolean {
    return this.form.membros.some((item) => item.usuarioId === usuarioId);
  }

  removeMember(usuarioId: string): void {
    this.form.membros = this.form.membros.filter((item) => item.usuarioId !== usuarioId);
    this.localForm.membroUsuarioIds = this.localForm.membroUsuarioIds.filter((id) => id !== usuarioId);
    if (this.comissaoEmEdicao) {
      this.comissaoEmEdicao = {
        ...this.comissaoEmEdicao,
        membros: this.comissaoEmEdicao.membros.filter((item) => item.usuarioId !== usuarioId),
      };
    }
    this.syncSelectedMembers();
  }

  startLocalCreate(): void {
    this.editingLocalId = null;
    this.localMemberTerm = '';
    this.localForm = {
      nome: '',
      membroUsuarioIds: [],
    };
    this.showLocalModal = true;
  }

  startLocalEdit(item: Local): void {
    this.editingLocalId = item.id;
    this.localMemberTerm = '';
    this.localForm = {
      nome: item.nome,
      membroUsuarioIds: item.membros.map((membro) => membro.usuarioId),
    };
    this.showLocalModal = true;
  }

  cancelLocalEdit(): void {
    this.editingLocalId = null;
    this.showLocalModal = false;
    this.localMemberTerm = '';
    this.localForm = {
      nome: '',
      membroUsuarioIds: [],
    };
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

    if (this.localForm.membroUsuarioIds.length === 0) {
      this.toastr.warning('Selecione ao menos um responsável pelo local.');
      return;
    }

    this.savingLocal = true;
    const payload = {
      nome,
      comissaoId: this.editingId,
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

  removeLocal(item: Local): void {
    if (!this.canManageCurrentComissao) {
      this.toastr.error('Você não pode excluir locais desta comissão.');
      return;
    }

    if (!confirm(`Deseja excluir o local "${item.nome}"?`)) {
      return;
    }

    this.localService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Local excluído com sucesso.');
        if (this.editingLocalId === item.id) {
          this.cancelLocalEdit();
        }
        this.loadLocais();
      },
      error: (error) => {
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir o local.');
      },
    });
  }

  getPresidenteNome(presidenteId: string): string {
    return this.usuariosInventario.find((item) => item.id === presidenteId)?.nome ?? '-';
  }

  setActiveTab(tab: 'dados' | 'membros' | 'locais'): void {
    this.activeTab = tab;
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

  canDelete(): boolean {
    return this.authService.isAdmin;
  }

  goBackToList(): void {
    this.router.navigate(['/comissoes']);
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
          status: item.status,
          presidenteId: item.presidenteId,
          membros: item.membros.map((membro) => ({
            usuarioId: membro.usuarioId,
          })),
        };
        this.syncSelectedMembers();
        this.loadingComissao = false;
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
      status: 'Inativa',
      presidenteId: '',
      membros: [],
    };
  }

  private syncComissaoCollections(): void {
    if (!this.editingId) {
      this.locaisDaComissaoEmEdicao = [];
      return;
    }

    this.locaisDaComissaoEmEdicao = this.locais
      .filter((item) => item.comissaoId === this.editingId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
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
}
