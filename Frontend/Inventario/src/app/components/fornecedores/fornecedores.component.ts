import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';
import { Fornecedor, FornecedorCnpjLookup, FornecedorPayload } from '../../contracts/fornecedor.model';
import { FornecedorService } from '../../contracts/fornecedor.service';
import { PageParams } from '../../shared/pagination.model';

@Component({
  selector: 'app-fornecedores',
  templateUrl: './fornecedores.component.html',
  styleUrl: './fornecedores.component.scss',
})
export class FornecedoresComponent implements OnInit, OnDestroy {
  fornecedores: Fornecedor[] = [];
  loading = false;
  saving = false;
  loadingCnpjLookup = false;
  showEditModal = false;
  editingId: string | null = null;
  openActionsFornecedorId: string | null = null;
  term = '';
  pageNumber = 1;
  readonly pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  private lastCnpjLookup = '';
  private readonly searchTermChanged$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  form: FornecedorPayload = {
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    telefoneContato: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
  };

  constructor(
    private readonly authService: AuthService,
    private readonly fornecedorService: FornecedorService,
    private readonly router: Router,
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
        this.loadFornecedores();
      });

    this.loadFornecedores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchTermChanged$.complete();
  }

  loadFornecedores(): void {
    this.loading = true;
    const params: PageParams = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      term: this.term.trim(),
    };

    this.fornecedorService.getPaged(params).subscribe({
      next: (data) => {
        this.fornecedores = data.items;
        this.pageNumber = data.pageNumber;
        this.totalCount = data.totalCount;
        this.totalPages = data.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar fornecedores.');
      },
    });
  }

  submit(): void {
    if (!this.editingId) {
      return;
    }

    this.saving = true;
    const payload: FornecedorPayload = {
      ...this.form,
      cnpj: this.onlyDigits(this.form.cnpj),
    };
    const request = this.fornecedorService.update(this.editingId, payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Fornecedor atualizado com sucesso.');
        this.cancel();
        this.loadFornecedores();
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Não foi possível salvar fornecedor.');
      },
    });
  }

  edit(item: Fornecedor): void {
    this.openActionsFornecedorId = null;
    this.editingId = item.id;
    this.lastCnpjLookup = this.onlyDigits(item.cnpj);
    this.form = {
      razaoSocial: item.razaoSocial,
      nomeFantasia: item.nomeFantasia,
      cnpj: this.formatCnpj(item.cnpj),
      email: item.email ?? '',
      telefoneContato: item.telefoneContato ?? '',
      endereco: item.endereco ?? '',
      cidade: item.cidade ?? '',
      estado: item.estado ?? '',
    };
    this.showEditModal = true;
  }

  viewDetails(item: Fornecedor): void {
    this.openActionsFornecedorId = null;
    this.router.navigate(['/fornecedores', item.id]);
  }

  get canEditFornecedores(): boolean {
    return this.authService.canManageContratos;
  }

  toggleActions(fornecedorId: string): void {
    this.openActionsFornecedorId =
      this.openActionsFornecedorId === fornecedorId ? null : fornecedorId;
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
    this.loadFornecedores();
  }

  goToPreviousPage(): void {
    if (this.pageNumber <= 1 || this.loading) {
      return;
    }

    this.pageNumber -= 1;
    this.loadFornecedores();
  }

  goToNextPage(): void {
    if (this.pageNumber >= this.totalPages || this.loading) {
      return;
    }

    this.pageNumber += 1;
    this.loadFornecedores();
  }

  get pageLabel(): string {
    if (this.totalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.pageNumber} de ${this.totalPages}`;
  }

  cancel(): void {
    this.showEditModal = false;
    this.editingId = null;
    this.loadingCnpjLookup = false;
    this.lastCnpjLookup = '';
    this.openActionsFornecedorId = null;
    this.form = {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      telefoneContato: '',
      email: '',
      endereco: '',
      cidade: '',
      estado: '',
    };
  }

  onCnpjInput(value: string): void {
    this.form.cnpj = this.formatCnpj(value);
    this.lookupByCnpj(this.form.cnpj);
  }

  private formatCnpj(value: string): string {
    const digits = this.onlyDigits(value).slice(0, 14);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }

    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private lookupByCnpj(value: string): void {
    const cnpj = this.onlyDigits(value);
    if (cnpj.length !== 14 || this.lastCnpjLookup === cnpj) {
      return;
    }

    this.lastCnpjLookup = cnpj;
    this.loadingCnpjLookup = true;
    this.fornecedorService.lookupByCnpj(cnpj).subscribe({
      next: (data) => {
        this.loadingCnpjLookup = false;
        if (!data || this.onlyDigits(this.form.cnpj) !== cnpj) {
          this.lastCnpjLookup = '';
          return;
        }

        this.applyLookup(data);
      },
      error: () => {
        this.loadingCnpjLookup = false;
        this.lastCnpjLookup = '';
      },
    });
  }

  private applyLookup(data: FornecedorCnpjLookup): void {
    this.form.razaoSocial = data.razaoSocial?.trim() || this.form.razaoSocial;
    this.form.nomeFantasia = data.nomeFantasia?.trim() || this.form.nomeFantasia;
    this.form.telefoneContato = data.telefoneContato?.trim() || this.form.telefoneContato;
    this.form.email = data.email?.trim() || this.form.email;
    this.form.endereco = data.endereco?.trim() || this.form.endereco;
    this.form.cidade = data.cidade?.trim() || this.form.cidade;
    this.form.estado = data.estado?.trim().toUpperCase() || this.form.estado;
  }
}
