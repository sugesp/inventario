import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../auth/auth.service';
import { Contrato } from '../../../contracts/contrato.model';
import { ContratoService } from '../../../contracts/contrato.service';
import { PageParams } from '../../../shared/pagination.model';

@Component({
  selector: 'app-contratos-list',
  templateUrl: './contratos-list.component.html',
  styleUrl: './contratos-list.component.scss',
})
export class ContratosListComponent implements OnInit, OnDestroy {
  contratos: Contrato[] = [];
  loading = false;
  term = '';
  pageNumber = 1;
  readonly pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  private readonly searchTermChanged$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly contratoService: ContratoService,
    readonly authService: AuthService,
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
        this.loadContratos();
      });

    this.loadContratos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchTermChanged$.complete();
  }

  loadContratos(): void {
    this.loading = true;
    const params: PageParams = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      term: this.term.trim(),
    };

    this.contratoService.getPaged(params).subscribe({
      next: (data) => {
        this.contratos = data.items;
        this.pageNumber = data.pageNumber;
        this.totalCount = data.totalCount;
        this.totalPages = data.totalPages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar os contratos.');
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
    this.loadContratos();
  }

  goToPreviousPage(): void {
    if (this.pageNumber <= 1 || this.loading) {
      return;
    }

    this.pageNumber -= 1;
    this.loadContratos();
  }

  goToNextPage(): void {
    if (this.pageNumber >= this.totalPages || this.loading) {
      return;
    }

    this.pageNumber += 1;
    this.loadContratos();
  }

  get pageLabel(): string {
    if (this.totalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.pageNumber} de ${this.totalPages}`;
  }

  remove(item: Contrato): void {
    if (!window.confirm(`Excluir contrato ${item.numero}?`)) {
      return;
    }

    this.contratoService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Contrato excluído com sucesso.');
        this.loadContratos();
      },
      error: () => this.toastr.error('Não foi possível excluir contrato.'),
    });
  }
}
