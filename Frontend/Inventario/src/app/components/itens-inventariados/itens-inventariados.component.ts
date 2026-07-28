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
import { Local } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

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
  locais: Local[] = [];

  loadingItens = false;
  loadingComissoes = false;
  selectedComissaoFilter = '';
  selectedLocalFilter = '';
  selectedLancamentoFilter: 'todos' | 'lancados' | 'pendentes' = 'todos';
  selectedTombamentoFilter: 'todos' | 'sem-tombamento-eestado' | 'sem-tombamento-antigo' | 'sem-ambos-tombamentos' = 'todos';
  pageNumber = 1;
  readonly pageSize = 20;
  selectedItemDetalhes: ItemInventariado | null = null;
  selectedItemFotos: ItemInventariado | null = null;
  selectedFoto: ItemInventarioFoto | null = null;
  loadingFotos = false;
  fotoObjectUrls: Record<string, string> = {};
  updatingLancamentoIds = new Set<string>();
  itemAcao: ItemInventariado | null = null;
  tipoAcao: 'excluir' | 'reverter-eestado' | null = null;
  justificativaAcao = '';
  processandoAcao = false;
  itemConfirmarLancamento: ItemInventariado | null = null;
  itemMoverLocal: ItemInventariado | null = null;
  localDestinoId = '';
  justificativaMovimentacao = '';
  processandoMovimentacao = false;
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
    private readonly localService: LocalService,
    private readonly sanitizer: DomSanitizer,
    private readonly toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadComissoes();
    this.loadItensInventariados();
    this.loadLocais();
  }

  loadLocais(): void {
    this.localService.getAll().subscribe({
      next: (data) => {
        this.locais = data;
      },
      error: () => {
        this.locais = [];
      },
    });
  }

  loadItensInventariados(): void {
    this.loadingItens = true;
    this.itemInventariadoService.getAll().subscribe({
      next: (data) => {
        this.itensInventariados = data;
        this.ensureValidPage();
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

  get paginatedItensInventariados(): ItemInventariado[] {
    const startIndex = (this.pageNumber - 1) * this.pageSize;
    return this.filteredItensInventariados.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItensInventariados.length / this.pageSize);
  }

  get pageLabel(): string {
    if (this.totalPages === 0) {
      return 'Página 0 de 0';
    }

    return `Página ${this.pageNumber} de ${this.totalPages}`;
  }

  clearFilters(): void {
    this.selectedComissaoFilter = '';
    this.selectedLocalFilter = '';
    this.selectedLancamentoFilter = 'todos';
    this.selectedTombamentoFilter = 'todos';
    this.onFiltersChanged();
  }

  onComissaoFilterChange(): void {
    this.selectedLocalFilter = '';
    this.onFiltersChanged();
  }

  onFiltersChanged(): void {
    this.pageNumber = 1;
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

  getComissaoLabel(comissao: Comissao): string {
    return `Comissão ${comissao.ano} - ${comissao.status}`;
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

  openConfirmarLancamento(item: ItemInventariado): void {
    this.itemConfirmarLancamento = item;
  }

  closeConfirmarLancamento(): void {
    if (this.itemConfirmarLancamento && this.isUpdatingLancamento(this.itemConfirmarLancamento)) {
      return;
    }

    this.itemConfirmarLancamento = null;
  }

  confirmarLancamentoEEstado(): void {
    const item = this.itemConfirmarLancamento;
    if (!item) {
      return;
    }

    this.updatingLancamentoIds.add(item.id);
    this.itemInventariadoService.marcarLancamentoEEstado(item.id, true).subscribe({
      next: (updated) => {
        this.updatingLancamentoIds.delete(item.id);
        this.itensInventariados = this.itensInventariados.map((current) =>
          current.id === updated.id ? updated : current
        );
        this.itemConfirmarLancamento = null;
        this.toastr.success('Item marcado como lançado no E-Estado.');
      },
      error: (error) => {
        this.updatingLancamentoIds.delete(item.id);
        this.toastr.error(error?.error?.message ?? 'Não foi possível atualizar o lançamento no E-Estado.');
      },
    });
  }

  openReverterEEstado(item: ItemInventariado): void {
    this.itemAcao = item;
    this.tipoAcao = 'reverter-eestado';
    this.justificativaAcao = '';
  }

  openExcluirItem(item: ItemInventariado): void {
    this.itemAcao = item;
    this.tipoAcao = 'excluir';
    this.justificativaAcao = '';
  }

  canExcluirItem(item: ItemInventariado): boolean {
    if (this.authService.isAdmin) {
      return true;
    }

    const usuarioId = this.authService.session?.userId;
    return !!usuarioId && this.comissoes.some((comissao) =>
      comissao.id === item.comissaoId && comissao.presidenteId === usuarioId
    );
  }

  openMoverLocal(item: ItemInventariado): void {
    this.itemMoverLocal = item;
    this.localDestinoId = '';
    this.justificativaMovimentacao = '';
  }

  closeMoverLocal(): void {
    if (this.processandoMovimentacao) {
      return;
    }

    this.itemMoverLocal = null;
    this.localDestinoId = '';
    this.justificativaMovimentacao = '';
  }

  get locaisDestinoDisponiveis(): Local[] {
    if (!this.itemMoverLocal?.comissaoId) {
      return [];
    }

    return this.locais
      .filter((local) =>
        local.comissaoId === this.itemMoverLocal?.comissaoId
        && local.id !== this.itemMoverLocal.localId
      )
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  get locaisDestinoOptions(): SearchableSelectOption[] {
    if (!this.itemMoverLocal?.comissaoId) {
      return [];
    }

    const locaisDaComissao = this.locais.filter(
      (local) => local.comissaoId === this.itemMoverLocal?.comissaoId
    );
    const idsDaComissao = new Set(locaisDaComissao.map((local) => local.id));
    const locaisPorSuperior = new Map<string | null, Local[]>();

    locaisDaComissao.forEach((local) => {
      const superiorId = local.localSuperiorId && idsDaComissao.has(local.localSuperiorId)
        ? local.localSuperiorId
        : null;
      const subordinados = locaisPorSuperior.get(superiorId) ?? [];
      subordinados.push(local);
      locaisPorSuperior.set(superiorId, subordinados);
    });
    locaisPorSuperior.forEach((locais) => locais.sort((a, b) => a.nome.localeCompare(b.nome)));

    const options: SearchableSelectOption[] = [];
    const adicionarOptions = (superiorId: string | null, depth: number): void => {
      (locaisPorSuperior.get(superiorId) ?? []).forEach((local) => {
        const localAtual = local.id === this.itemMoverLocal?.localId;
        if (!localAtual) {
          options.push({
            value: local.id,
            label: this.getLocalHierarchyLabel(local),
            depth,
          });
        }
        adicionarOptions(local.id, localAtual ? depth : depth + 1);
      });
    };
    adicionarOptions(null, 0);
    return options;
  }

  private getLocalHierarchyLabel(local: Local): string {
    const locaisDaComissao = this.locais.filter((item) => item.comissaoId === local.comissaoId);
    const locaisPorId = new Map(locaisDaComissao.map((item) => [item.id, item]));
    const caminho = [local.nome];
    const visitados = new Set<string>([local.id]);
    let superiorId = local.localSuperiorId;

    while (superiorId && locaisPorId.has(superiorId) && !visitados.has(superiorId)) {
      const superior = locaisPorId.get(superiorId)!;
      caminho.unshift(superior.nome);
      visitados.add(superiorId);
      superiorId = superior.localSuperiorId;
    }

    return caminho.join(' > ');
  }

  confirmarMovimentacaoLocal(): void {
    const justificativa = this.justificativaMovimentacao.trim();
    if (!this.itemMoverLocal || !this.localDestinoId || justificativa.length < 3) {
      this.toastr.warning('Selecione o local correto e informe uma justificativa.');
      return;
    }

    this.processandoMovimentacao = true;
    this.itemInventariadoService
      .moveToLocal(this.itemMoverLocal.id, this.localDestinoId, justificativa)
      .subscribe({
        next: (updated) => {
          this.itensInventariados = this.itensInventariados.map((item) =>
            item.id === updated.id ? updated : item
          );
          this.processandoMovimentacao = false;
          this.closeMoverLocal();
          this.toastr.success('Item movido para o local correto com histórico registrado.');
        },
        error: (error) => {
          this.processandoMovimentacao = false;
          this.toastr.error(error?.error?.message ?? 'Não foi possível corrigir o local do item.');
        },
      });
  }

  closeAcaoModal(): void {
    if (this.processandoAcao) {
      return;
    }

    this.itemAcao = null;
    this.tipoAcao = null;
    this.justificativaAcao = '';
  }

  confirmarAcao(): void {
    const justificativa = this.justificativaAcao.trim();
    if (!this.itemAcao || !this.tipoAcao || justificativa.length < 3) {
      this.toastr.warning('Informe uma justificativa com pelo menos 3 caracteres.');
      return;
    }

    this.processandoAcao = true;
    if (this.tipoAcao === 'reverter-eestado') {
      this.itemInventariadoService
        .marcarLancamentoEEstado(this.itemAcao.id, false, justificativa)
        .subscribe({
          next: (updated) => {
            this.itensInventariados = this.itensInventariados.map((item) =>
              item.id === updated.id ? updated : item
            );
            this.processandoAcao = false;
            this.closeAcaoModal();
            this.toastr.success('Lançamento no E-Estado revertido com justificativa registrada.');
          },
          error: (error) => {
            this.processandoAcao = false;
            this.toastr.error(error?.error?.message ?? 'Não foi possível reverter o lançamento no E-Estado.');
          },
        });
      return;
    }

    this.itemInventariadoService.delete(this.itemAcao.id, justificativa).subscribe({
      next: () => {
        const itemId = this.itemAcao?.id;
        this.itensInventariados = this.itensInventariados.filter((item) => item.id !== itemId);
        this.ensureValidPage();
        this.processandoAcao = false;
        this.closeAcaoModal();
        this.toastr.success('Item excluído com justificativa registrada.');
      },
      error: (error) => {
        this.processandoAcao = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível excluir o item inventariado.');
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
