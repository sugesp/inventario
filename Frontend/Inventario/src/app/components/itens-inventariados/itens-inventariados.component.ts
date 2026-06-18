import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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

interface MapDragState {
  pointerId: number;
  clientX: number;
  clientY: number;
  centerX: number;
  centerY: number;
}

@Component({
  selector: 'app-itens-inventariados',
  templateUrl: './itens-inventariados.component.html',
  styleUrl: './itens-inventariados.component.scss',
})
export class ItensInventariadosComponent implements OnInit {
  @ViewChild('mapViewport') mapViewport?: ElementRef<HTMLElement>;

  itensInventariados: ItemInventariado[] = [];
  comissoes: Comissao[] = [];

  loadingItens = false;
  loadingComissoes = false;
  selectedComissaoFilter = '';
  selectedLocalFilter = '';
  selectedLancamentoFilter: 'todos' | 'lancados' | 'pendentes' = 'todos';
  selectedTombamentoFilter: 'todos' | 'sem-tombamento-eestado' | 'sem-tombamento-antigo' | 'sem-ambos-tombamentos' = 'todos';
  selectedItemDetalhes: ItemInventariado | null = null;
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
  mapDragging = false;
  private mapViewportWidth = 640;
  private mapViewportHeight = 640;
  private mapDragState: MapDragState | null = null;

  constructor(
    readonly authService: AuthService,
    private readonly comissaoService: ComissaoService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly sanitizer: DomSanitizer,
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
            || this.authService.hasPermission('ControleInterno')
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

  openDetalhes(item: ItemInventariado): void {
    this.selectedItemDetalhes = item;
    this.loadFotos(item, false);
  }

  closeDetalhes(): void {
    this.selectedItemDetalhes = null;
    this.selectedFoto = null;
    this.loadingFotos = false;
    this.releaseFotoObjectUrls();
  }

  openFotos(item: ItemInventariado): void {
    this.selectedItemFotos = item;
    this.loadFotos(item);
  }

  closeFotos(): void {
    this.selectedItemFotos = null;
    this.selectedFoto = null;
    this.loadingFotos = false;
    this.releaseFotoObjectUrls();
  }

  loadFotos(item: ItemInventariado, selectFirst = true): void {
    this.releaseFotoObjectUrls();
    this.selectedFoto = selectFirst ? item.fotos[0] ?? null : null;
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
      || this.authService.hasPermission('ControleInterno')
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

  hasGeolocalizacaoLocal(item: ItemInventariado): boolean {
    return item.localLatitude !== null
      && item.localLatitude !== undefined
      && item.localLongitude !== null
      && item.localLongitude !== undefined;
  }

  getMapaUrl(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return '';
    }

    return `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=18/${item.latitude}/${item.longitude}`;
  }

  getCoordenadasLabel(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return 'Não informado';
    }

    return `${item.latitude}, ${item.longitude}`;
  }

  getPrecisaoLabel(item: ItemInventariado): string {
    if (item.precisaoLocalizacao === null || item.precisaoLocalizacao === undefined) {
      return 'Não informado';
    }

    return `${item.precisaoLocalizacao} m`;
  }

  getGeolocalizacaoBadgeLabel(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return 'Sem Localização';
    }

    const distancia = this.getDistanciaDoLocalMetros(item);
    if (distancia === null) {
      return 'Sem referência';
    }

    if (distancia <= 50) {
      return 'OK';
    }

    if (distancia <= 150) {
      return 'Atenção';
    }

    return 'Divergência';
  }

  getGeolocalizacaoBadgeTitle(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return 'Sem Localização';
    }

    const distancia = this.getDistanciaDoLocalMetros(item);
    if (distancia === null) {
      return 'Local sem coordenadas de referência cadastradas';
    }

    const distanciaLabel = `Distância do local: ${this.formatDistancia(distancia)}.`;

    if (distancia <= 50) {
      return `${distanciaLabel} OK até 50m`;
    }

    if (distancia <= 150) {
      return `${distanciaLabel} Atenção de 50m a 150m`;
    }

    return `${distanciaLabel} Divergência acima de 150m`;
  }

  getPrecisaoBadgeLabel(item: ItemInventariado): string {
    return `GPS: ${this.getPrecisaoLabel(item)}`;
  }

  getGeolocalizacaoBadgeClass(item: ItemInventariado): string {
    if (!this.hasGeolocalizacao(item)) {
      return 'geo-badge geo-badge-pending';
    }

    const distancia = this.getDistanciaDoLocalMetros(item);
    if (distancia === null) {
      return 'geo-badge geo-badge-pending';
    }

    if (distancia <= 50) {
      return 'geo-badge geo-badge-ok';
    }

    if (distancia <= 150) {
      return 'geo-badge geo-badge-warning';
    }

    return 'geo-badge geo-badge-danger';
  }

  getDistanciaDoLocalMetros(item: ItemInventariado): number | null {
    if (!this.hasGeolocalizacao(item) || !this.hasGeolocalizacaoLocal(item)) {
      return null;
    }

    return this.calcularDistanciaMetros(
      item.latitude!,
      item.longitude!,
      item.localLatitude!,
      item.localLongitude!
    );
  }

  getMiniMapaUrl(item: ItemInventariado): SafeResourceUrl | string {
    if (!this.hasGeolocalizacao(item)) {
      return '';
    }

    const latitude = item.latitude!;
    const longitude = item.longitude!;
    const offset = 0.001;
    const bbox = [
      longitude - offset,
      latitude - offset,
      longitude + offset,
      latitude + offset,
    ].join(',');

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`
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
    this.mapOpen = true;
    setTimeout(() => this.refreshMap());
  }

  closeMap(): void {
    this.mapOpen = false;
    this.mapTiles = [];
    this.mapMarkers = [];
    this.mapDragging = false;
    this.mapDragState = null;
  }

  zoomMapIn(): void {
    this.setMapZoom(this.mapZoom + 1);
  }

  zoomMapOut(): void {
    this.setMapZoom(this.mapZoom - 1);
  }

  onMapWheel(event: WheelEvent): void {
    event.preventDefault();
    this.setMapZoom(this.mapZoom + (event.deltaY < 0 ? 1 : -1));
  }

  beginMapDrag(event: PointerEvent): void {
    if (event.button !== 0 || (event.target as HTMLElement).closest('a, button')) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    this.updateMapViewportSize(target);
    const centerPixel = this.projectToPixel(this.mapCenterLatitude, this.mapCenterLongitude, this.mapZoom);
    this.mapDragState = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      centerX: centerPixel.x,
      centerY: centerPixel.y,
    };
    this.mapDragging = true;
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  dragMap(event: PointerEvent): void {
    if (!this.mapDragState || this.mapDragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - this.mapDragState.clientX;
    const deltaY = event.clientY - this.mapDragState.clientY;
    const coordinates = this.unprojectPixel(
      this.mapDragState.centerX - deltaX,
      this.mapDragState.centerY - deltaY,
      this.mapZoom
    );

    this.mapCenterLatitude = coordinates.latitude;
    this.mapCenterLongitude = coordinates.longitude;
    this.refreshMap();
    event.preventDefault();
  }

  endMapDrag(event: PointerEvent): void {
    if (!this.mapDragState || this.mapDragState.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    this.mapDragState = null;
    this.mapDragging = false;
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

  getLancamentoEEstadoTooltip(item: ItemInventariado): string {
    const usuario = item.lancadoEEstadoPorUsuarioNome || 'Usuário não informado';
    const data = item.lancadoEEstadoEm
      ? new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(item.lancadoEEstadoEm))
      : '';

    return data ? `${usuario} em ${data}` : usuario;
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

  hideSelectedFoto(): void {
    this.selectedFoto = null;
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

  private refreshMap(): void {
    this.updateMapViewportSize();
    this.mapTiles = this.buildMapTiles();
    this.mapMarkers = this.buildMapMarkers(this.itensGeolocalizados);
  }

  private setMapZoom(zoom: number): void {
    const nextZoom = Math.min(19, Math.max(3, zoom));
    if (nextZoom === this.mapZoom) {
      return;
    }

    this.mapZoom = nextZoom;
    this.refreshMap();
  }

  private updateMapViewportSize(element = this.mapViewport?.nativeElement): void {
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    this.mapViewportWidth = Math.max(1, rect.width);
    this.mapViewportHeight = Math.max(1, rect.height);
  }

  private buildMapTiles(): MapTile[] {
    const centerPixel = this.projectToPixel(this.mapCenterLatitude, this.mapCenterLongitude, this.mapZoom);
    const topLeftX = centerPixel.x - this.mapViewportWidth / 2;
    const topLeftY = centerPixel.y - this.mapViewportHeight / 2;
    const startX = Math.floor(topLeftX / 256) - 1;
    const endX = Math.floor((topLeftX + this.mapViewportWidth) / 256) + 1;
    const startY = Math.floor(topLeftY / 256) - 1;
    const endY = Math.floor((topLeftY + this.mapViewportHeight) / 256) + 1;
    const maxTile = 2 ** this.mapZoom;
    const tiles: MapTile[] = [];

    for (let tileY = startY; tileY <= endY; tileY += 1) {
      if (tileY < 0 || tileY >= maxTile) {
        continue;
      }

      for (let tileX = startX; tileX <= endX; tileX += 1) {
        const wrappedTileX = ((tileX % maxTile) + maxTile) % maxTile;
        tiles.push({
          url: `https://tile.openstreetmap.org/${this.mapZoom}/${wrappedTileX}/${tileY}.png`,
          left: tileX * 256 - topLeftX,
          top: tileY * 256 - topLeftY,
        });
      }
    }

    return tiles;
  }

  private buildMapMarkers(items: ItemInventariado[]): MapMarker[] {
    const centerPixel = this.projectToPixel(this.mapCenterLatitude, this.mapCenterLongitude, this.mapZoom);
    const topLeftX = centerPixel.x - this.mapViewportWidth / 2;
    const topLeftY = centerPixel.y - this.mapViewportHeight / 2;

    return items.map((item, index) => {
      const point = this.projectToPixel(item.latitude!, item.longitude!, this.mapZoom);

      return {
        item,
        left: point.x - topLeftX,
        top: point.y - topLeftY,
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

  private calcularDistanciaMetros(
    origemLatitude: number,
    origemLongitude: number,
    destinoLatitude: number,
    destinoLongitude: number
  ): number {
    const earthRadiusMeters = 6371000;
    const origemLatRad = this.toRadians(origemLatitude);
    const destinoLatRad = this.toRadians(destinoLatitude);
    const deltaLat = this.toRadians(destinoLatitude - origemLatitude);
    const deltaLng = this.toRadians(destinoLongitude - origemLongitude);
    const haversine =
      Math.sin(deltaLat / 2) ** 2
      + Math.cos(origemLatRad) * Math.cos(destinoLatRad) * Math.sin(deltaLng / 2) ** 2;

    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private formatDistancia(value: number): string {
    if (value < 1000) {
      return `${Math.round(value)} m`;
    }

    return `${(value / 1000).toFixed(2)} km`;
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
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

  private unprojectPixel(x: number, y: number, zoom: number): { latitude: number; longitude: number } {
    const scale = 256 * 2 ** zoom;
    const longitude = x / scale * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / scale;
    const latitude = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

    return {
      latitude: Math.max(-85.05112878, Math.min(85.05112878, latitude)),
      longitude: ((longitude + 540) % 360) - 180,
    };
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
