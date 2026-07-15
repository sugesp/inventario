import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Transferencia } from '../../contracts/transferencia.model';
import { TransferenciaService } from '../../contracts/transferencia.service';

@Component({
  selector: 'app-transferencias',
  templateUrl: './transferencias.component.html',
  styleUrl: './transferencias.component.scss',
})
export class TransferenciasComponent implements OnInit {
  transferencias: Transferencia[] = [];
  loading = false;
  selectedStatus = '';
  searchTerm = '';
  pageNumber = 1;
  readonly pageSize = 20;
  transferenciaParaConcluir: Transferencia | null = null;
  conclusaoForm = { idSeiTermo: '', dataEntrega: '' };
  concluindo = false;

  constructor(
    private readonly transferenciaService: TransferenciaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTransferencias();
  }

  get statusOptions(): string[] {
    return ['RASCUNHO', 'AGUARDANDO ASSINATURA', 'CONCLUÍDA', 'CANCELADA'];
  }

  get filteredTransferencias(): Transferencia[] {
    const normalizedTerm = this.normalize(this.searchTerm);
    const normalizedTermDigits = this.onlyDigits(this.searchTerm);

    return this.transferencias.filter((item) => {
      const matchesStatus = !this.selectedStatus || item.status === this.selectedStatus;
      if (!matchesStatus) {
        return false;
      }

      if (!normalizedTerm) {
        return true;
      }

      const destino = [
        item.unidadeAdministrativaDestinoSigla,
        item.unidadeAdministrativaDestinoNome,
      ].filter(Boolean).join(' ');
      const dataEntrega = this.formatDateForSearch(item.dataEntrega);
      const itensSearch = item.itens.flatMap((transferenciaItem) => [
        transferenciaItem.descricao,
        transferenciaItem.tombamentoNovo,
        transferenciaItem.tombamentoAntigo,
      ]);

      return [
        destino,
        item.responsavelDestino,
        item.idSeiTermo,
        dataEntrega,
        ...itensSearch,
      ].some((value) => this.matchesSearch(value, normalizedTerm, normalizedTermDigits));
    });
  }

  get paginatedTransferencias(): Transferencia[] {
    const startIndex = (this.pageNumber - 1) * this.pageSize;
    return this.filteredTransferencias.slice(startIndex, startIndex + this.pageSize);
  }

  get totalCount(): number {
    return this.filteredTransferencias.length;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  get pageLabel(): string {
    if (this.totalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.pageNumber} de ${this.totalPages}`;
  }

  loadTransferencias(): void {
    this.loading = true;
    this.transferenciaService.getAll().subscribe({
      next: (data) => {
        this.transferencias = data;
        this.ensureValidPage();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar as transferências.');
      },
    });
  }

  onFiltersChanged(): void {
    this.pageNumber = 1;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onFiltersChanged();
  }

  goToPreviousPage(): void {
    if (this.pageNumber <= 1) {
      return;
    }

    this.pageNumber -= 1;
  }

  goToNextPage(): void {
    if (this.pageNumber >= this.totalPages) {
      return;
    }

    this.pageNumber += 1;
  }

  canConcluirTransferencia(transferencia: Transferencia): boolean {
    const status = this.normalize(transferencia.status);
    return status !== 'concluida' && status !== 'cancelada' && transferencia.itens.length > 0;
  }

  openConclusaoModal(transferencia: Transferencia): void {
    this.transferenciaParaConcluir = transferencia;
    this.conclusaoForm = { idSeiTermo: '', dataEntrega: '' };
  }

  closeConclusaoModal(): void {
    if (this.concluindo) {
      return;
    }

    this.transferenciaParaConcluir = null;
    this.conclusaoForm = { idSeiTermo: '', dataEntrega: '' };
  }

  concluirTransferencia(): void {
    if (!this.transferenciaParaConcluir) {
      return;
    }

    const idSeiTermo = this.conclusaoForm.idSeiTermo.trim();
    if (!idSeiTermo || !this.conclusaoForm.dataEntrega) {
      this.toastr.warning('Informe o ID SEI do termo e a data de entrega.');
      return;
    }

    this.concluindo = true;
    this.transferenciaService.concluir(this.transferenciaParaConcluir.id, {
      idSeiTermo,
      dataEntrega: this.conclusaoForm.dataEntrega,
    }).subscribe({
      next: () => {
        this.concluindo = false;
        this.transferenciaParaConcluir = null;
        this.conclusaoForm = { idSeiTermo: '', dataEntrega: '' };
        this.toastr.success('Transferência concluída com sucesso.');
        this.loadTransferencias();
      },
      error: (error) => {
        this.concluindo = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível concluir a transferência.');
      },
    });
  }

  isConcluida(status: string | null | undefined): boolean {
    return this.normalize(status) === 'concluida';
  }

  private ensureValidPage(): void {
    if (this.totalPages === 0) {
      this.pageNumber = 1;
      return;
    }

    if (this.pageNumber > this.totalPages) {
      this.pageNumber = this.totalPages;
    }
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private matchesSearch(value: string | null | undefined, normalizedTerm: string, normalizedTermDigits: string): boolean {
    if (this.normalize(value).includes(normalizedTerm)) {
      return true;
    }

    return !!normalizedTermDigits && this.onlyDigits(value).includes(normalizedTermDigits);
  }

  private formatDateForSearch(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const [year, month, day] = value.slice(0, 10).split('-');
    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year} ${value}`;
  }
}
