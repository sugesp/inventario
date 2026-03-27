import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
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
  selectedItemFotos: ItemInventariado | null = null;
  selectedFoto: ItemInventarioFoto | null = null;

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
    this.selectedItemFotos = item;
    this.selectedFoto = item.fotos[0] ?? null;
  }

  closeFotos(): void {
    this.selectedItemFotos = null;
    this.selectedFoto = null;
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
      return matchesLocal && matchesEquipe;
    });
  }

  clearFilters(): void {
    this.selectedLocalFilter = '';
    this.selectedEquipeFilter = '';
  }

  selectFoto(foto: ItemInventarioFoto): void {
    this.selectedFoto = foto;
  }

  getFotoUrl(foto: ItemInventarioFoto | null | undefined): string {
    if (!foto) {
      return '';
    }

    const rawPath = foto.url?.trim() || foto.caminhoRelativo?.trim() || '';
    if (!rawPath) {
      return '';
    }

    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      return rawPath;
    }

    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const apiBaseUrl = environment.apiBaseUrl?.trim();

    if (apiBaseUrl) {
      try {
        const apiUrl = apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')
          ? new URL(apiBaseUrl)
          : new URL(apiBaseUrl, window.location.origin);

        return `${apiUrl.origin}${normalizedPath}`;
      } catch {
        return normalizedPath;
      }
    }

    return normalizedPath;
  }
}
