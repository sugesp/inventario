import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import * as L from 'leaflet';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { catchError, forkJoin, of } from 'rxjs';
import { Comissao } from '../../contracts/comissao.model';
import { ComissaoService } from '../../contracts/comissao.service';
import { ItemInventariado } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { Local } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';

interface PainelDados {
  comissao: Comissao | null;
  itens: ItemInventariado[];
  locais: Local[];
}

interface AgrupamentoMapa {
  latitude: number;
  longitude: number;
  quantidade: number;
  locais: Set<string>;
}

interface VisualizacaoMapa {
  latitude: number;
  longitude: number;
  zoom: number;
}

@Component({
  selector: 'app-painel-comissao',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './painel-comissao.component.html',
  styleUrl: './painel-comissao.component.scss',
})
export class PainelComissaoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapaInventario') mapaElement?: ElementRef<HTMLDivElement>;

  readonly anoAtual = new Date().getFullYear();
  readonly totalSecoes = 2;
  readonly chartLegendColor = '#d8e2f0';
  private readonly mapaStorageKey = 'inventario.painel.mapa.visualizacao';

  agora = new Date();
  secaoAtiva = 0;
  rotacaoPausada = false;
  carregando = true;
  atualizando = false;
  comissao: Comissao | null = null;
  itens: ItemInventariado[] = [];
  locais: Local[] = [];

  itensExibidos = 0;
  locaisExibidos = 0;
  eEstadoExibidos = 0;
  membrosExibidos = 0;

  progressoPorLocal: ChartData<'bar'> = { labels: [], datasets: [] };
  estadoConservacao: ChartData<'doughnut'> = { labels: [], datasets: [] };
  inventarioPorDia: ChartData<'line'> = { labels: [], datasets: [] };

  readonly barHorizontalOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    animation: { duration: 900 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { color: '#9eabc0', precision: 0 },
        grid: { color: 'rgba(255, 255, 255, .06)' },
        border: { display: false },
      },
      y: {
        ticks: { color: '#d8e2f0', font: { size: 11 } },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    animation: { animateRotate: true, duration: 1000 },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: this.chartLegendColor,
          boxWidth: 14,
          padding: 18,
          font: { size: 13, weight: 600 },
        },
      },
      tooltip: { enabled: false },
    },
  };

  readonly lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    animation: { duration: 900 },
    plugins: {
      legend: {
        labels: { color: this.chartLegendColor, boxWidth: 18, font: { size: 12 } },
      },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        ticks: { color: '#9eabc0', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#9eabc0', precision: 0 },
        grid: { color: 'rgba(255, 255, 255, .06)' },
        border: { display: false },
      },
    },
  };

  private relogioInterval?: ReturnType<typeof setInterval>;
  private rotacaoInterval?: ReturnType<typeof setInterval>;
  private atualizacaoInterval?: ReturnType<typeof setInterval>;
  private animationFrames: number[] = [];
  private mapa?: L.Map;
  private camadaAgrupamentos?: L.LayerGroup;
  private visualizacaoMapaRestaurada = false;

  constructor(
    private readonly comissaoService: ComissaoService,
    private readonly itemService: ItemInventariadoService,
    private readonly localService: LocalService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
    this.relogioInterval = setInterval(() => (this.agora = new Date()), 1000);
    this.iniciarRotacao();
    this.atualizacaoInterval = setInterval(() => this.carregarDados(), 60000);
  }

  ngAfterViewInit(): void {
    this.inicializarMapa();
  }

  ngOnDestroy(): void {
    [this.relogioInterval, this.rotacaoInterval, this.atualizacaoInterval].forEach((interval) => {
      if (interval) {
        clearInterval(interval);
      }
    });
    this.animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    this.mapa?.remove();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.voltarSecao();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.avancarSecao();
    } else if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      this.alternarRotacao();
    }
  }

  voltarSecao(): void {
    this.exibirSecao((this.secaoAtiva - 1 + this.totalSecoes) % this.totalSecoes);
  }

  avancarSecao(): void {
    this.exibirSecao((this.secaoAtiva + 1) % this.totalSecoes);
  }

  alternarRotacao(): void {
    this.rotacaoPausada = !this.rotacaoPausada;
    if (this.rotacaoPausada) {
      this.pararRotacao();
    } else {
      this.iniciarRotacao();
    }
  }

  get anoComissao(): number {
    return this.comissao?.ano ?? this.anoAtual;
  }

  get percentualProgresso(): number {
    return Math.min(100, Math.max(0, this.comissao?.percentualProgresso ?? 0));
  }

  get metaItens(): number {
    return this.comissao?.quantidadeItensEsperados ?? 0;
  }

  get quantidadeLocalizados(): number {
    return this.comissao?.quantidadeItensLocalizados ?? this.itens.length;
  }

  get locaisInventariados(): number {
    return new Set(this.itens.map((item) => item.localId).filter(Boolean)).size;
  }

  get itensLancadosEEstado(): number {
    return this.itens.filter((item) => item.lancadoEEstado).length;
  }

  get itensInventariadosHoje(): number {
    const hoje = new Date();
    return this.itens.filter((item) => this.mesmoDia(new Date(item.dataInventario), hoje)).length;
  }

  get itensGpsValidos(): number {
    return this.itens.filter((item) =>
      item.latitude != null
      && item.longitude != null
      && item.precisaoLocalizacao != null
      && item.precisaoLocalizacao <= 30
    ).length;
  }

  get itensGpsDesconsiderados(): number {
    return this.itens.filter((item) =>
      item.latitude != null
      && item.longitude != null
      && (item.precisaoLocalizacao == null || item.precisaoLocalizacao > 30)
    ).length;
  }

  get locaisConcluidos(): number {
    return this.locais.filter((local) => local.bloqueado).length;
  }

  get membrosAtivos(): number {
    const ids = new Set(this.comissao?.membros.map((membro) => membro.usuarioId) ?? []);
    if (this.comissao?.presidenteId) {
      ids.add(this.comissao.presidenteId);
    }
    return ids.size;
  }

  get ultimoItem(): ItemInventariado | null {
    return [...this.itens].sort(
      (a, b) => new Date(b.dataInventario).getTime() - new Date(a.dataInventario).getTime()
    )[0] ?? null;
  }

  get textoTicker(): string {
    if (!this.ultimoItem) {
      return 'Aguardando o primeiro item inventariado';
    }

    const data = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(this.ultimoItem.dataInventario));

    return `Último item inventariado: ${this.ultimoItem.descricao || this.ultimoItem.tombamentoNovo} — ${this.ultimoItem.localNome} — ${data}`;
  }

  private carregarDados(): void {
    if (this.atualizando) {
      return;
    }

    this.atualizando = true;
    const anteriores: PainelDados = {
      comissao: this.comissao,
      itens: this.itens,
      locais: this.locais,
    };

    forkJoin({
      comissao: this.comissaoService.getActive().pipe(catchError(() => of(anteriores.comissao))),
      itens: this.itemService.getAll().pipe(catchError(() => of(anteriores.itens))),
      locais: this.localService.getAll().pipe(catchError(() => of(anteriores.locais))),
    }).subscribe({
      next: (dados) => {
        this.comissao = dados.comissao;
        this.itens = dados.itens;
        this.locais = dados.locais;
        this.montarGraficos();
        this.atualizarMapa();
        this.animarKpis();
        this.carregando = false;
        this.atualizando = false;
        setTimeout(() => {
          this.inicializarMapa();
          this.atualizarMapa();
        });
      },
      error: () => {
        this.carregando = false;
        this.atualizando = false;
      },
    });
  }

  private exibirSecao(secao: number): void {
    this.secaoAtiva = secao;
    if (!this.rotacaoPausada) {
      this.iniciarRotacao();
    }
    if (secao === 1) {
      setTimeout(() => this.mapa?.invalidateSize(), 750);
    }
  }

  private iniciarRotacao(): void {
    this.pararRotacao();
    this.rotacaoInterval = setInterval(
      () => this.exibirSecao((this.secaoAtiva + 1) % this.totalSecoes),
      15000
    );
  }

  private pararRotacao(): void {
    if (this.rotacaoInterval) {
      clearInterval(this.rotacaoInterval);
      this.rotacaoInterval = undefined;
    }
  }

  private inicializarMapa(): void {
    if (this.mapa || !this.mapaElement) {
      return;
    }

    const visualizacaoSalva = this.lerVisualizacaoMapa();
    this.visualizacaoMapaRestaurada = visualizacaoSalva !== null;
    this.mapa = L.map(this.mapaElement.nativeElement, {
      center: visualizacaoSalva
        ? [visualizacaoSalva.latitude, visualizacaoSalva.longitude]
        : [-8.7612, -63.9004],
      zoom: visualizacaoSalva?.zoom ?? 12,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.mapa);
    this.camadaAgrupamentos = L.layerGroup().addTo(this.mapa);
    this.mapa.on('moveend zoomend', () => this.salvarVisualizacaoMapa());
    this.atualizarMapa();
  }

  private atualizarMapa(): void {
    if (!this.mapa || !this.camadaAgrupamentos) {
      return;
    }

    this.camadaAgrupamentos.clearLayers();
    const agrupamentos = this.agruparItensGeorreferenciados();
    const limites: L.LatLngExpression[] = [];

    agrupamentos.forEach((grupo) => {
      const coordenada: L.LatLngExpression = [grupo.latitude, grupo.longitude];
      limites.push(coordenada);
      const raio = Math.min(42, 10 + Math.sqrt(grupo.quantidade) * 5);
      L.circleMarker(coordenada, {
        radius: Math.max(raio, grupo.quantidade >= 100 ? 34 : 26),
        color: '#b9dcff',
        weight: 2,
        fillColor: grupo.quantidade > 20 ? '#e94560' : grupo.quantidade > 5 ? '#f5c451' : '#35c782',
        fillOpacity: .88,
      })
        .bindTooltip(
          `<strong>${grupo.quantidade} ${grupo.quantidade === 1 ? 'item' : 'itens'}</strong><br>${this.escaparHtml([...grupo.locais].join(', '))}`,
          { direction: 'top' }
        )
        .addTo(this.camadaAgrupamentos!);

      L.marker(coordenada, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'mapa-contagem-wrapper',
          html: `<span>${grupo.quantidade} ${grupo.quantidade === 1 ? 'item' : 'itens'}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
      }).addTo(this.camadaAgrupamentos!);
    });

    if (limites.length > 0 && !this.visualizacaoMapaRestaurada) {
      this.mapa.fitBounds(L.latLngBounds(limites), { padding: [55, 55], maxZoom: 18 });
      this.visualizacaoMapaRestaurada = true;
    }
  }

  private salvarVisualizacaoMapa(): void {
    if (!this.mapa || typeof localStorage === 'undefined') {
      return;
    }

    const centro = this.mapa.getCenter();
    const visualizacao: VisualizacaoMapa = {
      latitude: centro.lat,
      longitude: centro.lng,
      zoom: this.mapa.getZoom(),
    };
    localStorage.setItem(this.mapaStorageKey, JSON.stringify(visualizacao));
  }

  private lerVisualizacaoMapa(): VisualizacaoMapa | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const valor = localStorage.getItem(this.mapaStorageKey);
      if (!valor) {
        return null;
      }

      const visualizacao = JSON.parse(valor) as VisualizacaoMapa;
      return Number.isFinite(visualizacao.latitude)
        && Number.isFinite(visualizacao.longitude)
        && Number.isFinite(visualizacao.zoom)
        ? visualizacao
        : null;
    } catch {
      return null;
    }
  }

  private agruparItensGeorreferenciados(): AgrupamentoMapa[] {
    const grupos: AgrupamentoMapa[] = [];
    this.itens
      .filter((item) =>
        item.latitude != null
        && item.longitude != null
        && item.precisaoLocalizacao != null
        && item.precisaoLocalizacao <= 30
      )
      .forEach((item) => {
        const latitude = item.latitude as number;
        const longitude = item.longitude as number;
        const grupo = grupos.find((atual) =>
          this.distanciaEmMetros(latitude, longitude, atual.latitude, atual.longitude) <= 30
        );

        if (!grupo) {
          grupos.push({
            latitude,
            longitude,
            quantidade: 1,
            locais: new Set([item.localNome]),
          });
          return;
        }

        grupo.latitude = (grupo.latitude * grupo.quantidade + latitude) / (grupo.quantidade + 1);
        grupo.longitude = (grupo.longitude * grupo.quantidade + longitude) / (grupo.quantidade + 1);
        grupo.quantidade += 1;
        grupo.locais.add(item.localNome);
      });
    return grupos;
  }

  private distanciaEmMetros(latA: number, lngA: number, latB: number, lngB: number): number {
    const radianos = (valor: number): number => valor * Math.PI / 180;
    const deltaLat = radianos(latB - latA);
    const deltaLng = radianos(lngB - lngA);
    const calculo = Math.sin(deltaLat / 2) ** 2
      + Math.cos(radianos(latA)) * Math.cos(radianos(latB)) * Math.sin(deltaLng / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(calculo), Math.sqrt(1 - calculo));
  }

  private escaparHtml(valor: string): string {
    return valor
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private animarKpis(): void {
    this.animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    this.animationFrames = [
      this.animarNumero(this.itensExibidos, this.quantidadeLocalizados, (valor) => (this.itensExibidos = valor)),
      this.animarNumero(this.locaisExibidos, this.locaisInventariados, (valor) => (this.locaisExibidos = valor)),
      this.animarNumero(this.eEstadoExibidos, this.itensLancadosEEstado, (valor) => (this.eEstadoExibidos = valor)),
      this.animarNumero(this.membrosExibidos, this.membrosAtivos, (valor) => (this.membrosExibidos = valor)),
    ];
  }

  private animarNumero(inicio: number, fim: number, atualizar: (valor: number) => void): number {
    const duracao = 900;
    const iniciadoEm = performance.now();
    const executar = (agora: number): void => {
      const progresso = Math.min((agora - iniciadoEm) / duracao, 1);
      const suavizado = 1 - Math.pow(1 - progresso, 3);
      atualizar(Math.round(inicio + (fim - inicio) * suavizado));
      if (progresso < 1) {
        this.animationFrames.push(requestAnimationFrame(executar));
      }
    };
    return requestAnimationFrame(executar);
  }

  private montarGraficos(): void {
    this.montarProgressoPorLocal();
    this.montarEstadoConservacao();
    this.montarInventarioPorDia();
  }

  private montarProgressoPorLocal(): void {
    const quantidades = new Map<string, number>();
    this.itens.forEach((item) => {
      quantidades.set(item.localId, (quantidades.get(item.localId) ?? 0) + 1);
    });

    const topLocais = this.locais
      .map((local) => ({ local, quantidade: quantidades.get(local.id) ?? 0 }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    this.progressoPorLocal = {
      labels: topLocais.map(({ local }) => this.abreviar(local.nome, 27)),
      datasets: [{
        label: 'Itens inventariados',
        data: topLocais.map(({ quantidade }) => quantidade),
        backgroundColor: topLocais.map(({ local, quantidade }) =>
          local.bloqueado ? '#35c782' : quantidade > 0 ? '#f5c451' : '#64748b'
        ),
        borderRadius: 6,
        barThickness: 13,
      }],
    };
  }

  private montarEstadoConservacao(): void {
    const estados = ['Bom', 'Regular', 'Inservível'];
    const valores = estados.map((estado) =>
      this.itens.filter((item) => this.normalizar(item.estadoConservacao) === this.normalizar(estado)).length
    );

    this.estadoConservacao = {
      labels: estados.map((estado, indice) => `${estado}  ${valores[indice]}`),
      datasets: [{
        data: valores,
        backgroundColor: ['#35c782', '#f5c451', '#e94560'],
        borderColor: '#16213e',
        borderWidth: 4,
        hoverOffset: 0,
      }],
    };
  }

  private montarInventarioPorDia(): void {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dias = Array.from({ length: 30 }, (_, indice) => {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - (29 - indice));
      return data;
    });
    const quantidades = dias.map((dia) =>
      this.itens.filter((item) => this.mesmoDia(new Date(item.dataInventario), dia)).length
    );
    const mediaMovel = quantidades.map((_, indice) => {
      const amostra = quantidades.slice(Math.max(0, indice - 6), indice + 1);
      return Number((amostra.reduce((total, valor) => total + valor, 0) / amostra.length).toFixed(1));
    });

    this.inventarioPorDia = {
      labels: dias.map((dia) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(dia)),
      datasets: [
        {
          label: 'Itens por dia',
          data: quantidades,
          borderColor: '#4da3ff',
          backgroundColor: 'rgba(77, 163, 255, .14)',
          pointRadius: 1.5,
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Média móvel (7 dias)',
          data: mediaMovel,
          borderColor: '#f5c451',
          borderDash: [6, 5],
          pointRadius: 0,
          tension: 0.35,
        },
      ],
    };
  }

  private mesmoDia(dataA: Date, dataB: Date): boolean {
    return dataA.getFullYear() === dataB.getFullYear()
      && dataA.getMonth() === dataB.getMonth()
      && dataA.getDate() === dataB.getDate();
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  private abreviar(valor: string, limite: number): string {
    return valor.length > limite ? `${valor.slice(0, limite - 1)}…` : valor;
  }
}
