import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ItemInventariado, ItemInventarioFoto } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';

@Component({
  selector: 'app-itens-inventariados',
  templateUrl: './itens-inventariados.component.html',
  styleUrl: './itens-inventariados.component.scss',
})
export class ItensInventariadosComponent implements OnInit {
  itensInventariados: ItemInventariado[] = [];

  loadingItens = false;
  selectedLocalFilter = '';
  selectedEquipeFilter = '';
  selectedLancamentoFilter: 'todos' | 'lancados' | 'pendentes' = 'todos';
  selectedTombamentoFilter: 'todos' | 'sem-tombamento-eestado' | 'sem-tombamento-antigo' | 'sem-ambos-tombamentos' = 'todos';
  selectedItemFotos: ItemInventariado | null = null;
  selectedFoto: ItemInventarioFoto | null = null;
  loadingFotos = false;
  fotoObjectUrls: Record<string, string> = {};
  updatingLancamentoIds = new Set<string>();

  constructor(
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadItensInventariados();
  }

  loadItensInventariados(): void {
    this.loadingItens = true;
    this.itemInventariadoService.getAll().subscribe({
      next: (data) => {
        this.itensInventariados = data;
        this.loadingItens = false;
      },
      error: () => {
        this.loadingItens = false;
        this.toastr.error('Não foi possível carregar a listagem de itens inventariados.');
      },
    });
  }

  openFotos(item: ItemInventariado): void {
    this.releaseFotoObjectUrls();
    this.selectedItemFotos = item;
    this.selectedFoto = item.fotos[0] ?? null;
    this.loadingFotos = item.fotos.length > 0;

    if (!item.fotos.length) {
      return;
    }

    forkJoin(
      item.fotos.map((foto) =>
        this.itemInventariadoService.getFoto(item.id, foto.id).pipe(
          map((blob) => ({ fotoId: foto.id, url: URL.createObjectURL(blob), failed: false })),
          catchError(() => of({ fotoId: foto.id, url: '', failed: true }))
        )
      )
    ).subscribe({
      next: (results) => {
        this.loadingFotos = false;
        this.fotoObjectUrls = results.reduce<Record<string, string>>((acc, result) => {
          if (result.url) {
            acc[result.fotoId] = result.url;
          }

          return acc;
        }, {});

        if (results.some((result) => result.failed)) {
          this.toastr.warning('Algumas fotos não puderam ser carregadas.');
        }
      },
      error: () => {
        this.loadingFotos = false;
        this.toastr.error('Não foi possível carregar as fotos do item.');
      },
    });
  }

  closeFotos(): void {
    this.selectedItemFotos = null;
    this.selectedFoto = null;
    this.loadingFotos = false;
    this.releaseFotoObjectUrls();
  }

  get localOptions(): string[] {
    return [...new Set(this.itensInventariados.map((item) => item.localNome).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get equipeOptions(): string[] {
    return [...new Set(this.itensInventariados.map((item) => item.equipeDescricao).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get filteredItensInventariados(): ItemInventariado[] {
    return this.itensInventariados.filter((item) => {
      const matchesLocal = !this.selectedLocalFilter || item.localNome === this.selectedLocalFilter;
      const matchesEquipe = !this.selectedEquipeFilter || item.equipeDescricao === this.selectedEquipeFilter;
      const matchesLancamento =
        this.selectedLancamentoFilter === 'todos'
        || (this.selectedLancamentoFilter === 'lancados' && item.lancadoEEstado)
        || (this.selectedLancamentoFilter === 'pendentes' && !item.lancadoEEstado);
      const hasTombamentoNovo = !!item.tombamentoNovo?.trim();
      const hasTombamentoAntigo = !!item.tombamentoAntigo?.trim();
      const matchesTombamento =
        this.selectedTombamentoFilter === 'todos'
        || (this.selectedTombamentoFilter === 'sem-tombamento-eestado' && !hasTombamentoNovo)
        || (this.selectedTombamentoFilter === 'sem-tombamento-antigo' && !hasTombamentoAntigo)
        || (this.selectedTombamentoFilter === 'sem-ambos-tombamentos' && !hasTombamentoNovo && !hasTombamentoAntigo);

      return matchesLocal && matchesEquipe && matchesLancamento && matchesTombamento;
    });
  }

  clearFilters(): void {
    this.selectedLocalFilter = '';
    this.selectedEquipeFilter = '';
    this.selectedLancamentoFilter = 'todos';
    this.selectedTombamentoFilter = 'todos';
  }

  marcarLancamentoEEstado(item: ItemInventariado, lancado: boolean): void {
    this.updatingLancamentoIds.add(item.id);
    this.itemInventariadoService.marcarLancamentoEEstado(item.id, lancado).subscribe({
      next: (updated) => {
        this.updatingLancamentoIds.delete(item.id);
        this.itensInventariados = this.itensInventariados.map((current) =>
          current.id === updated.id ? updated : current
        );
        this.toastr.success(lancado ? 'Item marcado como lançado no E-Estado.' : 'Lançamento do E-Estado removido.');
      },
      error: (error) => {
        this.updatingLancamentoIds.delete(item.id);
        this.toastr.error(error?.error?.message ?? 'Não foi possível atualizar o lançamento no E-Estado.');
      },
    });
  }

  isUpdatingLancamento(item: ItemInventariado): boolean {
    return this.updatingLancamentoIds.has(item.id);
  }

  copyTombamento(item: ItemInventariado): void {
    const tombamento = item.tombamentoNovo?.trim();
    if (!tombamento) {
      this.toastr.warning('Este item não possui tombamento do E-Estado para copiar.');
      return;
    }

    this.copyText(tombamento)
      .then(() => this.toastr.success('Tombamento copiado.'))
      .catch(() => this.toastr.error('Não foi possível copiar o tombamento.'));
  }

  selectFoto(foto: ItemInventarioFoto): void {
    this.selectedFoto = foto;
  }

  getFotoUrl(foto: ItemInventarioFoto | null | undefined): string {
    if (!foto) {
      return '';
    }

    return this.fotoObjectUrls[foto.id] || '';
  }

  private releaseFotoObjectUrls(): void {
    Object.values(this.fotoObjectUrls).forEach((url) => URL.revokeObjectURL(url));
    this.fotoObjectUrls = {};
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}
