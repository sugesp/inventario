import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
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

  constructor(
    readonly authService: AuthService,
    private readonly transferenciaService: TransferenciaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTransferencias();
  }

  get statusOptions(): string[] {
    return [...new Set(this.transferencias.map((item) => item.status).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get filteredTransferencias(): Transferencia[] {
    return this.transferencias.filter((item) => !this.selectedStatus || item.status === this.selectedStatus);
  }

  loadTransferencias(): void {
    this.loading = true;
    this.transferenciaService.getAll().subscribe({
      next: (data) => {
        this.transferencias = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar as transferências.');
      },
    });
  }

  deleteTransferencia(id: string): void {
    if (!confirm('Deseja excluir esta transferência?')) {
      return;
    }

    this.transferenciaService.delete(id).subscribe({
      next: () => {
        this.toastr.success('Transferência excluída com sucesso.');
        this.loadTransferencias();
      },
      error: () => {
        this.toastr.error('Não foi possível excluir a transferência.');
      },
    });
  }
}
