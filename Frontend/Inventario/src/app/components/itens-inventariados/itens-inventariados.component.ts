import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Comissao } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { ItemInventariado, ItemInventarioFoto } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';

interface MapTile {
  url: string;
  left: number;
  top: number;
}

interface MapMarker {
  item: ItemInventariado;
  left: number;
  top: number;
  label: string;
}

type GeolocationStatusTone = 'ok' | 'warning' | 'danger' | 'pending';

@Component({
  selector: 'app-itens-inventariados',
  templateUrl: './itens-inventariados.component.html',
  styleUrl: './itens-inventariados.component.scss',
})
export class ItensInventariadosComponent implements OnInit {
  itensInventariados: ItemInventariado[] = [];
  comissoes: Comissao[] = [];

  loadingItens = false;
  loadingComissoes = false;
  selectedComissaoFilter = '';
  selectedLocalFilter = '';
  selectedLancamentoFilter: 'todos' | 'lancados' | 'pendentes' = 'todos';
  selectedTombamentoFilter: 'todos' | 'sem-tombamento-eestado' | 'sem-tombamento-antigo' | 'sem-ambos-tombamentos' = 'todos';
  selectedItemFotos: ItemInventariado | null = null;
  selectedFoto: ItemInventarioFoto | null = null;
  loadingFotos = false;
  fotoObjectUrls: Record<string, string> = {};
  updatingLancamentoIds = new Set<string>();
  mapOpen = false;
  mapTiles: MapTile[] = [];
  mapMarkers: MapMarker[] = [];
  mapZoom = 16;
  mapCenterLatitude = 0;
  mapCenterLongitude = 0;

  constructor(
    readonly authService: AuthService,
    private readonly comissaoService: ComissaoService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadComissoes();
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

  loadComissoes(): void {
    this.loadingComissoes = true;
    this.comissaoService.getAll().subscribe({
      next: (data) => {
        const usuarioId = this.authService.session?.userId;
        this.comissoes = data
          .filter((item) =>
            this.authService.isAdmin
            || item.presidenteId === usuarioId
            || item.membros.some((membro) => membro.usuarioId === usuarioId)
          )
          .sort((a, b) => b.ano - a.ano);
        this.loadingComissoes = false;
      },
      error: () => {
        this.loadingComissoes = false;
        this.toastr.error('Não foi possível carregar as comissões disponíveis.');
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
    return [...new Set(this.itensAcessiveis
      .filter((item) => !this.selectedComissaoFilter || item.comissaoId === this.selectedComissaoFilter)
      .map((item) => item.localNome)
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  get itensAcessiveis(): ItemInventariado[] {
    const comissaoIdsAcessiveis = new Set(this.comissoes.map((item) => item.id));

    return this.itensInventariados.filter((item) =>
      this.authService.isAdmin
      || (!!item.comissaoId && comissaoIdsAcessiveis.has(item.comissaoId))
    );
  }

  get filteredItensInventariados(): ItemInventariado[] {
    return this.itensAcessiveis.filter((item) => {
      const matchesComissao = !this.selectedComissaoFilter || item.comissaoId === this.selectedComissaoFilter;
      const matchesLocal = !this.selectedLocalFilter || item.localNome === this.selectedLocalFilter;
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

      return matchesComissao && matchesLocal && matchesLancamento && matchesTombamento;
    });
  }

  get itensGeolocalizados(): ItemInventariado[] {
    return this.filteredItensInventariados.filter((item) => this.hasGeolocalizacao(item));
  }

  clearFilters(): void {
    this.selectedComissaoFilter = '';
    this.selectedLocalFilter = '';
    this.selectedLancamentoFilter = 'todos';
    this.selectedTombamentoFilter = 'todos';
  }

  onComissaoFilterChange(): void {
    this.selectedLocalFilter = '';
  }

  getComissaoLabel(comissao: Comissao): string {
    return `Comissão ${comissao.ano} - ${comissao.status}`;
  }

  hasGeolocalizacao(item: ItemInventariado): boolean {
    return item.latitude !== null
      && item.latitude !== undefined
      && item.longitude !== null
      && item.longitude !== undefined;
  }

  getGeolocalizacaoLabel(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return '-';
    }

    const accuracy = item.precisaoLocalizacao !== null && item.precisaoLocalizacao !== undefined
      ? ` · ${Math.round(item.precisaoLocalizacao)} m`
      : '';

    return `${item.latitude!.toFixed(6)}, ${item.longitude!.toFixed(6)}${accuracy}`;
  }

  getMapaUrl(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return '';
    }

    return `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=18/${item.latitude}/${item.longitude}`;
  }

  getConferenciaLocalizacao(item: ItemInventariado): { label: string; tone: GeolocationStatusTone } {
    const distance = this.getDistanciaAteLocal(item);
    if (distance === null) {
      return {
        label: 'Pendente de justificativa',
        tone: 'pending',
      };
    }

    if (distance <= 50) {
      return {
        label: `OK · ${Math.round(distance)} m`,
        tone: 'ok',
      };
    }

    if (distance <= 150) {
      return {
        label: `Atenção · ${Math.round(distance)} m`,
        tone: 'warning',
      };
    }

    return {
      label: `Divergência · ${Math.round(distance)} m`,
      tone: 'danger',
    };
  }

  getDistanciaAteLocal(item: ItemInventariado): number | null {
    if (!this.hasGeolocalizacao(item)
      || item.localLatitude === null
      || item.localLatitude === undefined
      || item.localLongitude === null
      || item.localLongitude === undefined) {
      return null;
    }

    return this.calculateDistanceInMeters(
      item.latitude!,
      item.longitude!,
      item.localLatitude,
      item.localLongitude
    );
  }

  openMap(): void {
    const items = this.itensGeolocalizados;
    if (!items.length) {
      this.toastr.warning('Nenhum item filtrado possui geolocalização registrada.');
      return;
    }

    this.mapCenterLatitude = items.reduce((total, item) => total + item.latitude!, 0) / items.length;
    this.mapCenterLongitude = items.reduce((total, item) => total + item.longitude!, 0) / items.length;
    this.mapZoom = this.getBestMapZoom(items);
    this.mapTiles = this.buildMapTiles();
    this.mapMarkers = this.buildMapMarkers(items);
    this.mapOpen = true;
  }

  closeMap(): void {
    this.mapOpen = false;
    this.mapTiles = [];
    this.mapMarkers = [];
  }

  getMapMarkerTitle(marker: MapMarker): string {
    const tombamento = marker.item.tombamentoNovo || marker.item.tombamentoAntigo || 'Sem tombamento';
    return `${tombamento} - ${marker.item.descricao || 'Item inventariado'}`;
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

  private buildMapTiles(): MapTile[] {
    const centerTile = this.projectToTile(this.mapCenterLatitude, this.mapCenterLongitude, this.mapZoom);
    const startX = Math.floor(centerTile.x) - 1;
    const startY = Math.floor(centerTile.y) - 1;
    const tiles: MapTile[] = [];

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const tileX = startX + col;
        const tileY = startY + row;
        tiles.push({
          url: `https://tile.openstreetmap.org/${this.mapZoom}/${tileX}/${tileY}.png`,
          left: (col / 3) * 100,
          top: (row / 3) * 100,
        });
      }
    }

    return tiles;
  }

  private buildMapMarkers(items: ItemInventariado[]): MapMarker[] {
    const centerTile = this.projectToTile(this.mapCenterLatitude, this.mapCenterLongitude, this.mapZoom);
    const startX = Math.floor(centerTile.x) - 1;
    const startY = Math.floor(centerTile.y) - 1;

    return items.map((item, index) => {
      const point = this.projectToTile(item.latitude!, item.longitude!, this.mapZoom);

      return {
        item,
        left: ((point.x - startX) / 3) * 100,
        top: ((point.y - startY) / 3) * 100,
        label: String(index + 1),
      };
    });
  }

  private getBestMapZoom(items: ItemInventariado[]): number {
    if (items.length <= 1) {
      return 17;
    }

    for (let zoom = 17; zoom >= 4; zoom -= 1) {
      const points = items.map((item) => this.projectToPixel(item.latitude!, item.longitude!, zoom));
      const minX = Math.min(...points.map((point) => point.x));
      const maxX = Math.max(...points.map((point) => point.x));
      const minY = Math.min(...points.map((point) => point.y));
      const maxY = Math.max(...points.map((point) => point.y));

      if (maxX - minX <= 560 && maxY - minY <= 560) {
        return zoom;
      }
    }

    return 4;
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

  private calculateDistanceInMeters(
    originLatitude: number,
    originLongitude: number,
    targetLatitude: number,
    targetLongitude: number
  ): number {
    const earthRadiusInMeters = 6371000;
    const originLatitudeRadians = this.toRadians(originLatitude);
    const targetLatitudeRadians = this.toRadians(targetLatitude);
    const latitudeDelta = this.toRadians(targetLatitude - originLatitude);
    const longitudeDelta = this.toRadians(targetLongitude - originLongitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(originLatitudeRadians)
      * Math.cos(targetLatitudeRadians)
      * Math.sin(longitudeDelta / 2) ** 2;
    const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return earthRadiusInMeters * centralAngle;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
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
