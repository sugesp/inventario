import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { RegisterPayload, UserSummary } from '../../auth/auth.model';
import { Equipe } from '../../contracts/equipe.model';
import { EquipeService } from '../../contracts/equipe.service';
import { PageParams } from '../../shared/pagination.model';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit, OnDestroy {
  usuarios: UserSummary[] = [];
  equipes: Equipe[] = [];
  loading = false;
  loadingEquipes = false;
  saving = false;
  updatingStatusUserId: string | null = null;
  resettingUserId: string | null = null;
  showModal = false;
  editingUserId: string | null = null;
  openActionsUserId: string | null = null;
  term = '';
  pageNumber = 1;
  readonly pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  private readonly searchTermChanged$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  form: RegisterPayload = {
    nome: '',
    email: '',
    cpf: '',
    perfil: 'Operador',
    status: 'Ativo',
    equipeId: null,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly equipeService: EquipeService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.searchTermChanged$
      .pipe(
        debounceTime(environment.searchDebounceTimeMs),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.pageNumber = 1;
        this.loadUsers();
      });

    this.loadEquipes();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchTermChanged$.complete();
  }

  openModal(): void {
    this.editingUserId = null;
    this.openActionsUserId = null;
    this.showModal = true;
  }

  edit(usuario: UserSummary): void {
    this.editingUserId = usuario.id;
    this.openActionsUserId = null;
    this.form = {
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      perfil: usuario.perfil as RegisterPayload['perfil'],
      status: (usuario.status as RegisterPayload['status']) ?? 'Ativo',
      equipeId: usuario.equipeId ?? null,
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingUserId = null;
    this.form = {
      nome: '',
      email: '',
      cpf: '',
      perfil: 'Operador',
      status: 'Ativo',
      equipeId: null,
    };
  }

  toggleActions(usuarioId: string): void {
    this.openActionsUserId = this.openActionsUserId === usuarioId ? null : usuarioId;
  }

  getStatusLabel(status: string): string {
    return status;
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'Ativo') {
      return 'status-badge status-badge-active';
    }

    if (status === 'Pendente') {
      return 'status-badge status-badge-pending';
    }

    return 'status-badge status-badge-inactive';
  }

  loadEquipes(): void {
    this.loadingEquipes = true;
    this.equipeService.getAll().subscribe({
      next: (data) => {
        this.equipes = [...data].sort((a, b) => a.descricao.localeCompare(b.descricao));
        this.loadingEquipes = false;
      },
      error: () => {
        this.loadingEquipes = false;
        this.toastr.error('Nao foi possivel carregar as equipes.');
      },
    });
  }

  loadUsers(): void {
    this.loading = true;
    const params: PageParams = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      term: this.term.trim(),
    };

    this.authService.getPagedUsers(params).subscribe({
      next: (data) => {
        this.usuarios = data.items;
        this.pageNumber = data.pageNumber;
        this.totalCount = data.totalCount;
        this.totalPages = data.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Nao foi possivel carregar os usuarios.');
      },
    });
  }

  onTermChange(value: string): void {
    this.term = value;
    this.searchTermChanged$.next(this.term.trim());
  }

  clearSearch(): void {
    if (!this.term) {
      return;
    }

    this.term = '';
    this.pageNumber = 1;
    this.loadUsers();
  }

  goToPreviousPage(): void {
    if (this.pageNumber <= 1 || this.loading) {
      return;
    }

    this.pageNumber -= 1;
    this.loadUsers();
  }

  goToNextPage(): void {
    if (this.pageNumber >= this.totalPages || this.loading) {
      return;
    }

    this.pageNumber += 1;
    this.loadUsers();
  }

  get pageLabel(): string {
    if (this.totalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.pageNumber} de ${this.totalPages}`;
  }

  onCpfInput(value: string): void {
    if (this.editingUserId) {
      return;
    }

    this.form.cpf = this.formatCpf(value);
  }

  formatCpf(value: string): string {
    const digits = this.onlyDigits(value).slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  submit(): void {
    this.saving = true;
    const payload: RegisterPayload = {
      ...this.form,
      cpf: this.onlyDigits(this.form.cpf),
    };

    if (this.editingUserId) {
      this.authService.updateUser(this.editingUserId, payload).subscribe({
        next: () => {
          this.saving = false;
          this.toastr.success('Usuario atualizado com sucesso.');
          this.closeModal();
          this.loadUsers();
        },
        error: (error: any) => {
          this.saving = false;
          this.toastr.error(error?.error?.message ?? 'Nao foi possivel atualizar usuario.');
        },
      });
      return;
    }

    this.authService.register(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Usuario cadastrado com sucesso.');
        this.closeModal();
        this.loadUsers();
      },
      error: (error: any) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel cadastrar usuario.');
      },
    });
  }

  resetPassword(usuario: UserSummary): void {
    this.openActionsUserId = null;
    this.resettingUserId = usuario.id;
    this.authService.resetPassword(usuario.id).subscribe({
      next: () => {
        this.resettingUserId = null;
        this.toastr.success('Senha redefinida para 12345678. O usuario devera altera-la no proximo login.');
        this.loadUsers();
      },
      error: (error) => {
        this.resettingUserId = null;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel redefinir a senha.');
      },
    });
  }

  updateStatus(usuario: UserSummary, status: RegisterPayload['status']): void {
    if (usuario.status === status) {
      this.openActionsUserId = null;
      return;
    }

    this.updatingStatusUserId = usuario.id;
    this.openActionsUserId = null;

    const payload: RegisterPayload = {
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      perfil: usuario.perfil as RegisterPayload['perfil'],
      status,
      equipeId: usuario.equipeId ?? null,
    };

    this.authService.updateUser(usuario.id, payload).subscribe({
      next: () => {
        this.updatingStatusUserId = null;
        this.toastr.success(`Usuário marcado como ${status.toLowerCase()}.`);
        this.loadUsers();
      },
      error: (error) => {
        this.updatingStatusUserId = null;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel atualizar o status do usuario.');
      },
    });
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }
}
