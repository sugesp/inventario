import { Component } from '@angular/core';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConsultaTombamento } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';

@Component({
  selector: 'app-consulta-tombamento',
  templateUrl: './consulta-tombamento.component.html',
  styleUrl: './consulta-tombamento.component.scss',
})
export class ConsultaTombamentoComponent {
  patrimonio = '';
  resultado: ConsultaTombamento | null = null;
  searched = false;
  loading = false;

  constructor(
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) {}

  get totalOcorrencias(): number {
    if (!this.resultado) {
      return 0;
    }

    return this.resultado.ocorrencias.transferencias.length
      + this.resultado.ocorrencias.itensLevantamento.length
      + this.resultado.ocorrencias.laudos.length
      + this.resultado.ocorrencias.itensInventariados.length;
  }

  consultar(): void {
    const tombamento = this.normalizeTombamento(this.patrimonio);
    if (!tombamento) {
      this.toastr.warning('Informe um patrimônio do e-Estado para consultar.');
      return;
    }

    this.patrimonio = this.formatTombamento(tombamento);
    this.loading = true;
    this.searched = true;
    this.resultado = null;

    this.itemInventariadoService.consultarTombamento(tombamento)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (resultado) => {
          this.resultado = resultado;
        },
        error: (error) => {
          this.toastr.error(error?.error?.message ?? 'Não foi possível consultar o tombamento informado.');
        },
      });
  }

  limpar(): void {
    this.patrimonio = '';
    this.resultado = null;
    this.searched = false;
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return 'Não informado';
    }

    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  formatTombamentoDisplay(value?: string | null): string {
    const tombamento = this.normalizeTombamento(value ?? '');
    return tombamento ? this.formatTombamento(tombamento) : 'Não informado';
  }

  private normalizeTombamento(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    return digits ? digits.padStart(9, '0') : '';
  }

  private formatTombamento(value: string): string {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
  }
}
