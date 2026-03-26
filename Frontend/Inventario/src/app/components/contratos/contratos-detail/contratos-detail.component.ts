import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { Aditivo, AditivoPayload, TipoAditivo } from '../../../contracts/aditivo.model';
import { AditivoService } from '../../../contracts/aditivo.service';
import { Contrato } from '../../../contracts/contrato.model';
import { ContratoService } from '../../../contracts/contrato.service';
import { Empenho, EmpenhoPayload } from '../../../contracts/empenho.model';
import { EmpenhoService } from '../../../contracts/empenho.service';
import { EquipeContrato, EquipeContratoPayload, FuncaoEquipeContrato } from '../../../contracts/equipe-contrato.model';
import { EquipeContratoService } from '../../../contracts/equipe-contrato.service';
import { ExercicioAnual } from '../../../contracts/exercicio-anual.model';
import { ExercicioAnualService } from '../../../contracts/exercicio-anual.service';
import { Liquidacao, LiquidacaoPayload } from '../../../contracts/liquidacao.model';
import { LiquidacaoService } from '../../../contracts/liquidacao.service';
import { Pagamento, PagamentoPayload } from '../../../contracts/pagamento.model';
import { PagamentoService } from '../../../contracts/pagamento.service';
import { RestoPagar, RestoPagarPayload } from '../../../contracts/resto-pagar.model';
import { RestoPagarService } from '../../../contracts/resto-pagar.service';
import { GlosaNotaFiscal, GlosaNotaFiscalPayload } from '../../../contracts/glosa-nota-fiscal.model';
import { GlosaNotaFiscalService } from '../../../contracts/glosa-nota-fiscal.service';
import { Notificacao, NotificacaoPayload } from '../../../contracts/notificacao.model';
import { NotificacaoService } from '../../../contracts/notificacao.service';
import { NotaFiscal, NotaFiscalPayload } from '../../../contracts/nota-fiscal.model';
import { NotaFiscalService } from '../../../contracts/nota-fiscal.service';
import { Portaria, PortariaPayload } from '../../../contracts/portaria.model';
import { PortariaService } from '../../../contracts/portaria.service';
import { ProcessoPagamento, ProcessoPagamentoPayload } from '../../../contracts/processo-pagamento.model';
import { ProcessoPagamentoService } from '../../../contracts/processo-pagamento.service';
import { PageTitleService } from '../../../core/page-title.service';
import { SearchableSelectOption } from '../../shared/searchable-select/searchable-select.component';

interface DetailField {
  label: string;
  value: string;
  copyValue?: string;
  copyLabel?: string;
  tableColumns?: string[];
  tableRows?: DetailTableCell[][];
  fullWidth?: boolean;
}

interface DetailTableCell {
  value: string;
  copyValue?: string;
  align?: 'start' | 'end';
}

interface LiquidacaoEvolucaoItem {
  ano: number;
  valor: number;
  percentual: number;
}

interface NotificacaoRespostaForm {
  idSeiResposta: string;
  dataResposta: string;
}

@Component({
  selector: 'app-contratos-detail',
  templateUrl: './contratos-detail.component.html',
  styleUrl: './contratos-detail.component.scss',
})
export class ContratosDetailComponent implements OnInit {
  private overlayPointerDownOutside = false;
  contratoId = '';
  activeTab:
    | 'visao-geral'
    | 'aditivos'
    | 'exercicios'
    | 'notificacoes'
    | 'portarias'
    | 'equipe' = 'visao-geral';
  activeExercicioTab: 'resumo' | 'processos' | 'empenhos' | 'notas-fiscais' | 'liquidacoes' | 'pagamentos' = 'resumo';
  selectedExercicioId = '';
  private referenceTimestamp = Date.now();

  contrato: Contrato | null = null;
  aditivos: Aditivo[] = [];
  exercicios: ExercicioAnual[] = [];
  processosPagamento: ProcessoPagamento[] = [];
  empenhos: Empenho[] = [];
  notasFiscais: NotaFiscal[] = [];
  glosasNotasFiscais: GlosaNotaFiscal[] = [];
  liquidacoes: Liquidacao[] = [];
  pagamentos: Pagamento[] = [];
  restosPagar: RestoPagar[] = [];
  equipe: EquipeContrato[] = [];
  notificacoes: Notificacao[] = [];
  portarias: Portaria[] = [];
  usuariosResponsaveis: Array<{ id: string; nome: string; cpf: string }> = [];

  loading = false;
  savingAditivo = false;
  savingProcessoPagamento = false;
  savingEmpenho = false;
  savingNotaFiscal = false;
  savingGlosaNotaFiscal = false;
  savingLiquidacao = false;
  savingPagamento = false;
  savingRestoPagar = false;
  savingEquipe = false;
  savingEncerramentoEquipe = false;
  savingNotificacao = false;
  savingNotificacaoResposta = false;
  savingPortaria = false;

  showAditivoModal = false;
  showProcessoPagamentoModal = false;
  showEmpenhoModal = false;
  showNotaFiscalModal = false;
  showGlosaNotaFiscalModal = false;
  showLiquidacaoModal = false;
  showPagamentoModal = false;
  showRestoPagarModal = false;
  showEquipeModal = false;
  showHistoricoEquipeModal = false;
  showEncerrarEquipeModal = false;
  showNotificacaoModal = false;
  showNotificacaoRespostaModal = false;
  showPortariaModal = false;
  showRecordDetailsModal = false;
  editingAditivoId: string | null = null;
  editingProcessoPagamentoId: string | null = null;
  editingEmpenhoId: string | null = null;
  editingNotaFiscalId: string | null = null;
  editingGlosaNotaFiscalId: string | null = null;
  editingLiquidacaoId: string | null = null;
  editingPagamentoId: string | null = null;
  editingRestoPagarId: string | null = null;
  editingEquipeId: string | null = null;
  editingNotificacaoId: string | null = null;
  notificacaoRespondendo: Notificacao | null = null;
  editingPortariaId: string | null = null;
  recordDetailsTitle = '';
  recordDetailsFields: DetailField[] = [];
  recordDetailsStatus = '';
  recordDetailsStatusAlert = false;

  aditivoForm: AditivoPayload = {
    contratoId: '',
    numero: '',
    idSei: '',
    tipo: TipoAditivo.Renovacao,
    observacao: '',
    dataInicio: '',
    novaVigencia: '',
    valor: 0,
  };

  processoPagamentoForm: ProcessoPagamentoPayload = {
    exercicioAnualId: '',
    numeroProcesso: '',
    observacoes: '',
  };

  empenhoForm: EmpenhoPayload = {
    exercicioAnualId: '',
    numeroEmpenho: '',
    idSei: '',
    dataEmpenho: '',
    valorEmpenhado: 0,
    fonte: '',
    observacao: '',
  };

  notaFiscalForm: NotaFiscalPayload = {
    processoPagamentoId: '',
    numero: '',
    serie: '',
    referencia: '',
    idSei: '',
    dataEmissao: '',
    valor: 0,
    baseCalculo: 0,
    inss: 0,
    iss: 0,
    irrf: 0,
  };

  glosaNotaFiscalForm: GlosaNotaFiscalPayload = {
    notaFiscalId: '',
    idSei: '',
    valorGlosa: 0,
    dataGlosa: '',
    descricao: '',
  };

  liquidacaoForm: LiquidacaoPayload = {
    notaFiscalId: '',
    numeroLiquidacao: '',
    idSei: '',
    dataLiquidacao: '',
    valorLiquidado: 0,
    observacao: '',
  };

  pagamentoForm: PagamentoPayload = {
    liquidacaoId: '',
    numeroOrdemBancaria: '',
    idSeiOrdemBancaria: '',
    valorOrdemBancaria: 0,
    dataOrdemBancaria: '',
    numeroPreparacaoPagamento: '',
    idSeiPreparacaoPagamento: '',
    valorPreparacaoPagamento: 0,
    dataPreparacaoPagamento: '',
  };

  restoPagarForm: RestoPagarPayload = {
    empenhoId: '',
    numeroNotaLancamento: '',
    idSei: '',
    data: '',
    valor: 0,
  };

  notificacaoForm: NotificacaoPayload = {
    contratoId: '',
    titulo: '',
    descricao: '',
    idSei: '',
    dataNotificacao: '',
    idSeiResposta: '',
    dataResposta: '',
  };

  notificacaoRespostaForm: NotificacaoRespostaForm = {
    idSeiResposta: '',
    dataResposta: '',
  };

  equipeForm: EquipeContratoPayload = {
    contratoId: '',
    usuarioId: '',
    portariaId: null,
    funcao: FuncaoEquipeContrato.Gestor,
    ehSubstituto: false,
    dataInclusao: null,
    dataExclusao: null,
  };

  portariaForm: PortariaPayload = {
    contratoId: '',
    numeroPortaria: '',
    idSei: '',
    descricao: '',
    dataPublicacao: '',
  };

  encerrandoEquipe: EquipeContrato | null = null;
  motivoExclusaoEquipe = '';

  readonly tipoAditivoOptions = [
    { value: TipoAditivo.Renovacao, label: 'Renovação' },
    { value: TipoAditivo.Acrescimo, label: 'Acréscimo' },
    { value: TipoAditivo.Supressao, label: 'Supressão' },
    { value: TipoAditivo.Apostilamento, label: 'Apostilamento' },
  ];

  readonly funcoesEquipe = [
    { value: FuncaoEquipeContrato.Gestor, label: 'Gestor' },
    { value: FuncaoEquipeContrato.Fiscal, label: 'Fiscal' },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly contratoService: ContratoService,
    private readonly aditivoService: AditivoService,
    private readonly exercicioAnualService: ExercicioAnualService,
    private readonly processoPagamentoService: ProcessoPagamentoService,
    private readonly empenhoService: EmpenhoService,
    private readonly notaFiscalService: NotaFiscalService,
    private readonly glosaNotaFiscalService: GlosaNotaFiscalService,
    private readonly liquidacaoService: LiquidacaoService,
    private readonly pagamentoService: PagamentoService,
    private readonly restoPagarService: RestoPagarService,
    private readonly equipeContratoService: EquipeContratoService,
    private readonly notificacaoService: NotificacaoService,
    private readonly portariaService: PortariaService,
    private readonly pageTitleService: PageTitleService
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastr.error('Contrato inválido.');
      this.router.navigate(['/contratos']);
      return;
    }

    this.contratoId = id;
    this.aditivoForm.contratoId = id;
    this.equipeForm.contratoId = id;
    this.notificacaoForm.contratoId = id;
    this.portariaForm.contratoId = id;
    this.loadDetails();
  }

  back(): void {
    this.router.navigate(['/contratos']);
  }

  copyToClipboard(value: string, label = 'ID Sei'): void {
    const normalizedValue = value?.trim();
    if (!normalizedValue) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(normalizedValue).then(
        () => this.toastr.success(`${label} copiado.`),
        () => this.copyToClipboardFallback(normalizedValue, label)
      );
      return;
    }

    this.copyToClipboardFallback(normalizedValue, label);
  }

  setActiveTab(tab: ContratosDetailComponent['activeTab']): void {
    this.activeTab = tab;
  }

  setActiveExercicioTab(tab: ContratosDetailComponent['activeExercicioTab']): void {
    this.activeExercicioTab = tab;
  }

  get canManageContratoActions(): boolean {
    return this.authService.canManageContratos;
  }

  get canEditExecutionActions(): boolean {
    return !!this.contrato && this.authService.canManageFinanceiro;
  }

  get possuiUsuariosResponsaveis(): boolean {
    return this.usuariosResponsaveis.length > 0;
  }

  get isAditivoRenovacao(): boolean {
    return this.aditivoForm.tipo === TipoAditivo.Renovacao;
  }

  onAditivoTipoChange(): void {
    if (this.aditivoForm.tipo === TipoAditivo.Renovacao) {
      this.aditivoForm.valor = 0;
      return;
    }

    this.aditivoForm.novaVigencia = '';
  }

  get totalAditivoAcrescimo(): number {
    return this.aditivos
      .filter((item) => item.tipo === TipoAditivo.Acrescimo || item.tipo === TipoAditivo.Apostilamento)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get totalAditivoSupressao(): number {
    return this.aditivos
      .filter((item) => item.tipo === TipoAditivo.Supressao)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get quantidadeAditivosAcrescimo(): number {
    return this.aditivos.filter((item) => item.tipo === TipoAditivo.Acrescimo).length;
  }

  get quantidadeAditivosSupressao(): number {
    return this.aditivos.filter((item) => item.tipo === TipoAditivo.Supressao).length;
  }

  get quantidadeAditivosRenovacao(): number {
    return this.aditivos.filter((item) => item.tipo === TipoAditivo.Renovacao).length;
  }

  get quantidadeAditivosApostilamento(): number {
    return this.aditivos.filter((item) => item.tipo === TipoAditivo.Apostilamento).length;
  }

  get totalEmpenhado(): number {
    return this.empenhos.reduce((acc, item) => acc + Number(item.valorEmpenhado || 0), 0);
  }

  get totalLiquidado(): number {
    return this.liquidacoes.reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get totalGlosado(): number {
    return this.glosasNotasFiscais.reduce((acc, item) => acc + Number(item.valorGlosa || 0), 0);
  }

  get totalNotasFiscaisValor(): number {
    return this.notasFiscais.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get totalLiquidacoes(): number {
    return this.liquidacoes.reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get resumoExerciciosLabel(): string {
    if (this.exercicios.length === 0) {
      return 'Sem exercícios';
    }

    const anos = [...this.exercicios]
      .map((item) => item.ano)
      .sort((a, b) => a - b);

    if (anos.length === 1) {
      return `${anos[0]}`;
    }

    return `${anos[0]} a ${anos[anos.length - 1]}`;
  }

  get evolucaoLiquidacoesPorAno(): LiquidacaoEvolucaoItem[] {
    const itens = this.exercicios
      .map((exercicio) => {
        const notaIds = new Set(
          this.notasFiscais
            .filter((item) => item.exercicioAnualId === exercicio.id)
            .map((item) => item.id)
        );
        const valor = this.liquidacoes
          .filter((item) => notaIds.has(item.notaFiscalId))
          .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);

        return {
          ano: exercicio.ano,
          valor,
          percentual: 0,
        };
      })
      .filter((item) => item.valor > 0)
      .sort((a, b) => a.ano - b.ano);

    const maiorValor = Math.max(...itens.map((item) => item.valor), 0);

    return itens.map((item) => ({
      ...item,
      percentual: maiorValor > 0 ? Math.max((item.valor / maiorValor) * 100, 8) : 0,
    }));
  }

  get totalEmpenhadoDoExercicio(): number {
    return this.empenhosDoExercicio.reduce((acc, item) => acc + Number(item.valorEmpenhado || 0), 0);
  }

  get totalLiquidadoDoExercicio(): number {
    return this.liquidacoesDoExercicio.reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get totalNotasFiscaisValorDoExercicio(): number {
    return this.notasFiscaisDoExercicio.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get totalGlosadoDoExercicio(): number {
    const notaIdsDoExercicio = new Set(this.notasFiscaisDoExercicio.map((item) => item.id));
    return this.glosasNotasFiscais
      .filter((item) => notaIdsDoExercicio.has(item.notaFiscalId))
      .reduce((acc, item) => acc + Number(item.valorGlosa || 0), 0);
  }

  get totalLiquidacoesDoExercicio(): number {
    return this.liquidacoesDoExercicio.reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get totalRestosPagarDoExercicio(): number {
    return this.restosPagarDoExercicio.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get mediaNotasFiscaisDoExercicio(): number {
    if (this.notasFiscaisDoExercicio.length === 0) {
      return 0;
    }

    return this.totalNotasFiscaisValorDoExercicio / this.notasFiscaisDoExercicio.length;
  }

  get saldoEmpenhoDoExercicio(): number {
    return this.totalEmpenhadoDoExercicio - this.totalLiquidadoDoExercicio - this.totalRestosPagarDoExercicio;
  }

  get percentualFinanceiroDoExercicio(): number {
    if (this.totalEmpenhadoDoExercicio <= 0) {
      return 0;
    }

    return Math.min((this.totalLiquidadoDoExercicio / this.totalEmpenhadoDoExercicio) * 100, 100);
  }

  get percentualRestosPagarDoExercicio(): number {
    if (this.totalEmpenhadoDoExercicio <= 0) {
      return 0;
    }

    return Math.min((this.totalRestosPagarDoExercicio / this.totalEmpenhadoDoExercicio) * 100, 100);
  }

  get percentualComprometidoDoExercicio(): number {
    if (this.totalEmpenhadoDoExercicio <= 0) {
      return 0;
    }

    return Math.min(
      ((this.totalLiquidadoDoExercicio + this.totalRestosPagarDoExercicio) / this.totalEmpenhadoDoExercicio) * 100,
      100
    );
  }

  get totalProjetadoNotasDoExercicio(): number {
    return Math.min(this.totalNotasFiscaisValorDoExercicio, this.totalEmpenhadoDoExercicio);
  }

  get totalNotasNaoLiquidadasDoExercicio(): number {
    return Math.max(this.totalProjetadoNotasDoExercicio - this.totalLiquidadoDoExercicio, 0);
  }

  get percentualProjetadoNotasDoExercicio(): number {
    if (this.totalEmpenhadoDoExercicio <= 0) {
      return 0;
    }

    return Math.min((this.totalProjetadoNotasDoExercicio / this.totalEmpenhadoDoExercicio) * 100, 100);
  }

  get percentualNotasNaoLiquidadasDoExercicio(): number {
    return Math.max(this.percentualProjetadoNotasDoExercicio - this.percentualComprometidoDoExercicio, 0);
  }

  get percentualTempoDoExercicio(): number {
    if (!this.selectedExercicio) {
      return 0;
    }

    const inicio = new Date(this.selectedExercicio.ano, 0, 1).getTime();
    const fim = new Date(this.selectedExercicio.ano, 11, 31, 23, 59, 59, 999).getTime();
    return this.calculatePercentualPeriodo(inicio, fim);
  }

  get periodoExercicioSelecionado(): string {
    if (!this.selectedExercicio) {
      return '';
    }

    const ano = this.selectedExercicio.ano;
    return `01/01/${ano} até 31/12/${ano}`;
  }

  get selectedNotaFiscal(): NotaFiscal | undefined {
    return this.notasFiscais.find((x) => x.id === this.liquidacaoForm.notaFiscalId);
  }

  get selectedNotaFiscalDaGlosa(): NotaFiscal | undefined {
    return this.notasFiscais.find((x) => x.id === this.glosaNotaFiscalForm.notaFiscalId);
  }

  get totalLiquidadoNaNotaFiscalSelecionada(): number {
    return this.liquidacoes
      .filter((x) => x.notaFiscalId === this.liquidacaoForm.notaFiscalId && x.id !== this.editingLiquidacaoId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get totalGlosadoNaNotaFiscalSelecionada(): number {
    return this.glosasNotasFiscais
      .filter((x) => x.notaFiscalId === this.glosaNotaFiscalForm.notaFiscalId && x.id !== this.editingGlosaNotaFiscalId)
      .reduce((acc, item) => acc + Number(item.valorGlosa || 0), 0);
  }

  get totalLiquidadoNoExercicioDaNotaSelecionada(): number {
    const exercicioId = this.selectedNotaFiscal?.exercicioAnualId;
    if (!exercicioId) {
      return 0;
    }

    const notaIdsDoExercicio = new Set(
      this.notasFiscais.filter((item) => item.exercicioAnualId === exercicioId).map((item) => item.id)
    );

    return this.liquidacoes
      .filter((item) => notaIdsDoExercicio.has(item.notaFiscalId) && item.id !== this.editingLiquidacaoId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  get saldoDisponivelEmpenhosExercicioSelecionado(): number {
    const exercicioId = this.selectedNotaFiscal?.exercicioAnualId;
    if (!exercicioId) {
      return 0;
    }

    const totalEmpenhado = this.empenhos
      .filter((item) => item.exercicioAnualId === exercicioId)
      .reduce((acc, item) => acc + Number(item.valorEmpenhado || 0), 0);

    return Math.max(totalEmpenhado - this.totalLiquidadoNoExercicioDaNotaSelecionada, 0);
  }

  get saldoDisponivelNotaFiscalSelecionada(): number {
    return Math.max(
      Number(this.selectedNotaFiscal?.valor || 0)
      - this.totalLiquidadoNaNotaFiscalSelecionada
      - this.getTotalGlosadoByNotaFiscal(this.liquidacaoForm.notaFiscalId),
      0
    );
  }

  get glosaEmEdicao(): GlosaNotaFiscal | undefined {
    return this.glosasNotasFiscais.find((item) => item.id === this.editingGlosaNotaFiscalId);
  }

  get glosaValorEmEdicao(): number {
    return Number(this.glosaEmEdicao?.valorGlosa || 0);
  }

  get glosaValorInformado(): number {
    return Number(this.glosaNotaFiscalForm.valorGlosa || 0);
  }

  get limiteGlosaDisponivel(): number {
    return Math.max(
      Number(this.selectedNotaFiscalDaGlosa?.valor || 0)
      - this.totalGlosadoNaNotaFiscalSelecionada
      - this.getTotalLiquidadoByNotaFiscal(this.glosaNotaFiscalForm.notaFiscalId),
      0
    );
  }

  get glosaInvalida(): boolean {
    if (!this.glosaValorInformado || this.glosaValorInformado <= 0) {
      return false;
    }

    return this.glosaValorInformado > this.limiteGlosaDisponivel;
  }

  get saldoDisponivelContratoNoExercicioSelecionado(): number {
    const exercicioId = this.selectedNotaFiscal?.exercicioAnualId;
    if (!exercicioId) {
      return 0;
    }

    const notaIdsDoExercicio = new Set(
      this.notasFiscais.filter((item) => item.exercicioAnualId === exercicioId).map((item) => item.id)
    );

    const totalLiquidadoExercicio = this.liquidacoes
      .filter((item) => notaIdsDoExercicio.has(item.notaFiscalId) && item.id !== this.editingLiquidacaoId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);

    return Math.max(Number(this.contrato?.valorAtualContrato || 0) - totalLiquidadoExercicio, 0);
  }

  get saldoDisponivelContrato(): number {
    return Math.max(
      Number(this.contrato?.valorAtualContrato || 0) - (this.totalLiquidacoes - this.liquidacaoValorEmEdicao),
      0
    );
  }

  get possuiSaldoDisponivelParaLiquidacao(): boolean {
    return this.saldoEmpenhoDoExercicio > 0 && this.notaFiscalOptions.length > 0;
  }

  get limiteLiquidacaoDisponivel(): number {
    return Math.min(
      this.saldoDisponivelEmpenhosExercicioSelecionado || 0,
      this.saldoDisponivelNotaFiscalSelecionada || 0,
      this.saldoDisponivelContratoNoExercicioSelecionado
    );
  }

  get liquidacaoValorInformado(): number {
    return Number(this.liquidacaoForm.valorLiquidado || 0);
  }

  get liquidacaoInvalida(): boolean {
    if (!this.liquidacaoValorInformado || this.liquidacaoValorInformado <= 0) {
      return false;
    }

    return this.liquidacaoValorInformado > this.limiteLiquidacaoDisponivel;
  }

  get saldoContrato(): number {
    return Number(this.contrato?.valorAtualContrato || 0) - this.totalLiquidacoes;
  }

  get liquidacaoEmEdicao(): Liquidacao | undefined {
    return this.liquidacoes.find((item) => item.id === this.editingLiquidacaoId);
  }

  get liquidacaoValorEmEdicao(): number {
    return Number(this.liquidacaoEmEdicao?.valorLiquidado || 0);
  }

  get percentualGastoContrato(): number {
    const valorTotal = Number(this.contrato?.valorAtualContrato || 0);
    if (valorTotal <= 0) {
      return 0;
    }

    return Math.min((this.totalLiquidacoes / valorTotal) * 100, 100);
  }

  get percentualTempoContrato(): number {
    if (!this.contrato?.dataInicio || !this.contrato?.vigenciaAtual) {
      return 0;
    }

    const inicio = new Date(this.contrato.dataInicio).getTime();
    const fim = new Date(this.contrato.vigenciaAtual).getTime();
    return this.calculatePercentualPeriodo(inicio, fim);
  }

  get equipeVigente(): EquipeContrato[] {
    return this.equipe.filter((item) => !item.dataExclusao);
  }

  get equipeHistorico(): EquipeContrato[] {
    return this.equipe.filter((item) => !!item.dataExclusao);
  }

  get usuarioResponsavelOptions(): SearchableSelectOption[] {
    return this.usuariosResponsaveis.map((usuario) => ({
      value: usuario.id,
      label: `${usuario.nome} (${usuario.cpf})`,
    }));
  }

  get portariaOptions(): SearchableSelectOption[] {
    return this.portarias.map((portaria) => ({
      value: portaria.id,
      label: `${portaria.numeroPortaria} - ${portaria.idSei}`,
    }));
  }

  get exercicioOptions(): SearchableSelectOption[] {
    return [...this.exercicios]
      .sort((a, b) => b.ano - a.ano)
      .map((exercicio) => ({
        value: exercicio.id,
        label: `${exercicio.ano}`,
      }));
  }

  get selectedExercicio(): ExercicioAnual | undefined {
    return this.exercicios.find((item) => item.id === this.selectedExercicioId);
  }

  get processosPagamentoDoExercicio(): ProcessoPagamento[] {
    return this.processosPagamento.filter((item) => item.exercicioAnualId === this.selectedExercicioId);
  }

  get empenhosDoExercicio(): Empenho[] {
    return this.empenhos.filter((item) => item.exercicioAnualId === this.selectedExercicioId);
  }

  get notasFiscaisDoExercicio(): NotaFiscal[] {
    return this.notasFiscais.filter((item) => item.exercicioAnualId === this.selectedExercicioId);
  }

  get liquidacoesDoExercicio(): Liquidacao[] {
    const notaIdsDoExercicio = new Set(this.notasFiscaisDoExercicio.map((item) => item.id));
    return this.liquidacoes.filter((item) => notaIdsDoExercicio.has(item.notaFiscalId));
  }

  get pagamentosDoExercicio(): Pagamento[] {
    return this.pagamentos.filter((item) => item.exercicioAnualId === this.selectedExercicioId);
  }

  get restosPagarDoExercicio(): RestoPagar[] {
    return this.restosPagar.filter((item) => item.exercicioAnualId === this.selectedExercicioId);
  }

  get totalCanceladoDoExercicio(): number {
    return this.restosPagarDoExercicio.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get glosasDoExercicio(): GlosaNotaFiscal[] {
    const notaIdsDoExercicio = new Set(this.notasFiscaisDoExercicio.map((item) => item.id));
    return this.glosasNotasFiscais.filter((item) => notaIdsDoExercicio.has(item.notaFiscalId));
  }

  get processoPagamentoOptions(): SearchableSelectOption[] {
    return this.processosPagamentoDoExercicio.map((processo) => ({
      value: processo.id,
      label: `${processo.numeroProcesso}`,
    }));
  }

  get liquidacaoSemPagamentoOptions(): SearchableSelectOption[] {
    const pagamentoByLiquidacaoId = new Set(
      this.pagamentos
        .filter((item) => item.id !== this.editingPagamentoId)
        .map((item) => item.liquidacaoId)
    );

    return this.liquidacoesDoExercicio
      .filter((liquidacao) => liquidacao.id === this.pagamentoForm.liquidacaoId || !pagamentoByLiquidacaoId.has(liquidacao.id))
      .map((liquidacao) => ({
        value: liquidacao.id,
        label: `${liquidacao.numeroLiquidacao} • NF ${this.getNotaFiscalNumero(liquidacao.notaFiscalId)} • ${this.formatCurrency(liquidacao.valorLiquidado)}`,
      }));
  }

  get empenhoComSaldoParaRestoPagar(): Empenho | undefined {
    const saldos = this.calculateSaldoDisponivelPorEmpenho(this.selectedExercicioId, this.editingRestoPagarId);

    return [...this.empenhosDoExercicio]
      .reverse()
      .find((item) => (saldos.get(item.id) ?? 0) > 0);
  }

  get valorSugeridoRestoPagar(): number {
    if (!this.empenhoComSaldoParaRestoPagar) {
      return 0;
    }

    return this.calculateSaldoDisponivelPorEmpenho(this.selectedExercicioId, this.editingRestoPagarId)
      .get(this.empenhoComSaldoParaRestoPagar.id) ?? 0;
  }

  get numeroEmpenhoRestoPagarSelecionado(): string {
    if (this.editingRestoPagarId) {
      return this.restosPagarDoExercicio.find((item) => item.id === this.editingRestoPagarId)?.numeroEmpenho || '-';
    }

    return this.empenhoComSaldoParaRestoPagar?.numeroEmpenho || '-';
  }

  getRestosPagarByEmpenho(empenhoId: string): RestoPagar[] {
    return this.restosPagarDoExercicio.filter((item) => item.empenhoId === empenhoId);
  }

  getTotalCanceladoByEmpenho(empenhoId: string): number {
    return this.getRestosPagarByEmpenho(empenhoId)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get notaFiscalOptions(): SearchableSelectOption[] {
    const notaFiscalSelecionadaId = this.liquidacaoForm.notaFiscalId;

    return this.notasFiscaisDoExercicio
      .filter((notaFiscal) => {
        if (notaFiscal.id === notaFiscalSelecionadaId) {
          return true;
        }

        return this.getSaldoDisponivelNotaFiscal(notaFiscal.id) > 0;
      })
      .map((notaFiscal) => ({
      value: notaFiscal.id,
      label: `${notaFiscal.exercicioAno} - NF ${notaFiscal.numero}/${notaFiscal.serie}`,
      }));
  }

  getTipoAditivoLabel(tipo: TipoAditivo): string {
    return this.tipoAditivoOptions.find((item) => item.value === tipo)?.label || `${tipo}`;
  }

  getNotaFiscalNumero(notaFiscalId: string): string {
    const notaFiscal = this.notasFiscais.find((x) => x.id === notaFiscalId);
    return notaFiscal ? `${notaFiscal.numero}/${notaFiscal.serie}` : notaFiscalId;
  }

  getPagamentoLiquidacaoLabel(pagamento: Pagamento): string {
    if (pagamento.numeroLiquidacao) {
      return pagamento.numeroLiquidacao;
    }

    const liquidacao = this.findLiquidacaoById(pagamento.liquidacaoId);
    return liquidacao?.numeroLiquidacao || liquidacao?.idSei || '-';
  }

  getPagamentoNotaFiscalLabel(pagamento: Pagamento): string {
    if (pagamento.numeroNotaFiscal) {
      return pagamento.numeroNotaFiscal;
    }

    const liquidacao = this.findLiquidacaoById(pagamento.liquidacaoId);
    if (liquidacao?.notaFiscalId) {
      return this.getNotaFiscalNumero(liquidacao.notaFiscalId);
    }

    if (pagamento.notaFiscalId) {
      return this.getNotaFiscalNumero(pagamento.notaFiscalId);
    }

    return '-';
  }

  get liquidacaoSelecionadaPagamento(): Liquidacao | undefined {
    return this.findLiquidacaoById(this.pagamentoForm.liquidacaoId);
  }

  get totalPagamentoInformado(): number {
    return Number(this.pagamentoForm.valorOrdemBancaria || 0) + Number(this.pagamentoForm.valorPreparacaoPagamento || 0);
  }

  get pagamentoTemPreparacaoInformada(): boolean {
    return Number(this.pagamentoForm.valorPreparacaoPagamento || 0) > 0
      || !!this.pagamentoForm.numeroPreparacaoPagamento?.trim()
      || !!this.pagamentoForm.idSeiPreparacaoPagamento?.trim()
      || !!this.pagamentoForm.dataPreparacaoPagamento;
  }

  get pagamentoPreparacaoIncompleta(): boolean {
    if (!this.pagamentoTemPreparacaoInformada) {
      return false;
    }

    return !this.pagamentoForm.numeroPreparacaoPagamento?.trim()
      || !this.pagamentoForm.idSeiPreparacaoPagamento?.trim()
      || !this.pagamentoForm.dataPreparacaoPagamento
      || Number(this.pagamentoForm.valorPreparacaoPagamento || 0) <= 0;
  }

  get pagamentoTotalInvalido(): boolean {
    const liquidacao = this.liquidacaoSelecionadaPagamento;
    if (!liquidacao) {
      return false;
    }

    return this.totalPagamentoInformado !== Number(liquidacao.valorLiquidado || 0);
  }

  private findLiquidacaoById(liquidacaoId: string): Liquidacao | undefined {
    const normalizedLiquidacaoId = (liquidacaoId || '').toLowerCase();
    return this.liquidacoes.find((item) => (item.id || '').toLowerCase() === normalizedLiquidacaoId);
  }

  isNotaFiscalLiquidada(notaFiscalId: string): boolean {
    const notaFiscal = this.notasFiscais.find((x) => x.id === notaFiscalId);
    if (!notaFiscal) {
      return false;
    }

    const totalLiquidado = this.liquidacoes
      .filter((x) => x.notaFiscalId === notaFiscalId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);

    return totalLiquidado >= Number(notaFiscal.valor || 0) && Number(notaFiscal.valor || 0) > 0;
  }

  getSaldoDisponivelNotaFiscal(notaFiscalId: string): number {
    const notaFiscal = this.notasFiscais.find((x) => x.id === notaFiscalId);
    if (!notaFiscal) {
      return 0;
    }

    const totalLiquidado = this.liquidacoes
      .filter((x) => x.notaFiscalId === notaFiscalId && x.id !== this.editingLiquidacaoId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
    const totalGlosado = this.getTotalGlosadoByNotaFiscal(notaFiscalId);

    return Math.max(Number(notaFiscal.valor || 0) - totalLiquidado - totalGlosado, 0);
  }

  getGlosasByNotaFiscal(notaFiscalId: string): GlosaNotaFiscal[] {
    return this.glosasDoExercicio.filter((item) => item.notaFiscalId === notaFiscalId);
  }

  countEmpenhosByExercicio(exercicioId: string): number {
    return this.empenhos.filter((item) => item.exercicioAnualId === exercicioId).length;
  }

  countProcessosByExercicio(exercicioId: string): number {
    return this.processosPagamento.filter((item) => item.exercicioAnualId === exercicioId).length;
  }

  countNotasByProcesso(processoId: string): number {
    return this.notasFiscais.filter((item) => item.processoPagamentoId === processoId).length;
  }

  onSelectedExercicioChange(value: string | number | null): void {
    this.selectedExercicioId = typeof value === 'string' ? value : '';
  }

  openAditivoModal(aditivo?: Aditivo): void {
    if (!this.canManageContratoActions) {
      return;
    }

    this.editingAditivoId = aditivo?.id || null;
    this.aditivoForm = aditivo ? this.mapAditivoToForm(aditivo) : this.createAditivoForm();
    this.showAditivoModal = true;
  }

  closeAditivoModal(): void {
    this.showAditivoModal = false;
    this.editingAditivoId = null;
    this.aditivoForm = this.createAditivoForm();
  }

  openProcessoPagamentoModal(processo?: ProcessoPagamento): void {
    if (processo && !this.canEditExecutionActions) {
      return;
    }

    if (!processo && !this.canEditExecutionActions) {
      return;
    }

    this.editingProcessoPagamentoId = processo?.id || null;
    this.processoPagamentoForm = processo
      ? this.mapProcessoPagamentoToForm(processo)
      : this.createProcessoPagamentoForm();
    this.showProcessoPagamentoModal = true;
  }

  closeProcessoPagamentoModal(): void {
    this.showProcessoPagamentoModal = false;
    this.editingProcessoPagamentoId = null;
    this.processoPagamentoForm = this.createProcessoPagamentoForm();
  }

  openEmpenhoModal(empenho?: Empenho): void {
    if (empenho && !this.canEditExecutionActions) {
      return;
    }

    if (!empenho && !this.canEditExecutionActions) {
      return;
    }

    this.editingEmpenhoId = empenho?.id || null;
    this.empenhoForm = empenho ? this.mapEmpenhoToForm(empenho) : this.createEmpenhoForm();
    this.showEmpenhoModal = true;
  }

  closeEmpenhoModal(): void {
    this.showEmpenhoModal = false;
    this.editingEmpenhoId = null;
    this.empenhoForm = this.createEmpenhoForm();
  }

  openNotaFiscalModal(notaFiscal?: NotaFiscal): void {
    if (notaFiscal && !this.canEditExecutionActions) {
      return;
    }

    if (!notaFiscal && !this.canEditExecutionActions) {
      return;
    }

    this.editingNotaFiscalId = notaFiscal?.id || null;
    this.notaFiscalForm = notaFiscal ? this.mapNotaFiscalToForm(notaFiscal) : this.createNotaFiscalForm();
    this.showNotaFiscalModal = true;
  }

  closeNotaFiscalModal(): void {
    this.showNotaFiscalModal = false;
    this.editingNotaFiscalId = null;
    this.notaFiscalForm = this.createNotaFiscalForm();
  }

  openLiquidacaoModal(liquidacao?: Liquidacao): void {
    if (liquidacao && !this.canEditExecutionActions) {
      return;
    }

    if (!liquidacao && !this.canEditExecutionActions) {
      return;
    }

    this.editingLiquidacaoId = liquidacao?.id || null;
    this.liquidacaoForm = liquidacao ? this.mapLiquidacaoToForm(liquidacao) : this.createLiquidacaoForm();
    this.showLiquidacaoModal = true;
  }

  openPagamentoModal(pagamento?: Pagamento): void {
    if (pagamento && !this.canEditExecutionActions) {
      return;
    }

    if (!pagamento && !this.canEditExecutionActions) {
      return;
    }

    this.editingPagamentoId = pagamento?.id || null;
    this.pagamentoForm = pagamento ? this.mapPagamentoToForm(pagamento) : this.createPagamentoForm();
    this.showPagamentoModal = true;
  }

  openRestoPagarModal(restoPagar?: RestoPagar): void {
    if (restoPagar && !this.canEditExecutionActions) {
      return;
    }

    if (!restoPagar && !this.canEditExecutionActions) {
      return;
    }

    this.editingRestoPagarId = restoPagar?.id || null;
    this.restoPagarForm = restoPagar ? this.mapRestoPagarToForm(restoPagar) : this.createRestoPagarForm();
    this.showRestoPagarModal = true;
  }

  openGlosaNotaFiscalModal(notaFiscal: NotaFiscal, glosa?: GlosaNotaFiscal): void {
    if (!this.canEditExecutionActions) {
      return;
    }

    this.editingGlosaNotaFiscalId = glosa?.id || null;
    this.glosaNotaFiscalForm = glosa
      ? this.mapGlosaNotaFiscalToForm(glosa)
      : this.createGlosaNotaFiscalForm(notaFiscal.id);
    this.showGlosaNotaFiscalModal = true;
  }

  closeGlosaNotaFiscalModal(): void {
    this.showGlosaNotaFiscalModal = false;
    this.editingGlosaNotaFiscalId = null;
    this.glosaNotaFiscalForm = this.createGlosaNotaFiscalForm();
  }

  closeLiquidacaoModal(): void {
    this.showLiquidacaoModal = false;
    this.editingLiquidacaoId = null;
    this.liquidacaoForm = this.createLiquidacaoForm();
  }

  closePagamentoModal(): void {
    this.showPagamentoModal = false;
    this.editingPagamentoId = null;
    this.pagamentoForm = this.createPagamentoForm();
  }

  closeRestoPagarModal(): void {
    this.showRestoPagarModal = false;
    this.editingRestoPagarId = null;
    this.restoPagarForm = this.createRestoPagarForm();
  }

  openEquipeModal(item?: EquipeContrato): void {
    if (item && !this.canManageContratoActions) {
      return;
    }

    if (!item && !this.canManageContratoActions) {
      return;
    }

    this.editingEquipeId = item?.id || null;
    this.equipeForm = item ? this.mapEquipeToForm(item) : this.createEquipeForm();
    this.showEquipeModal = true;
  }

  closeEquipeModal(): void {
    this.showEquipeModal = false;
    this.editingEquipeId = null;
    this.equipeForm = this.createEquipeForm();
  }

  openHistoricoEquipeModal(): void {
    this.showHistoricoEquipeModal = true;
  }

  closeHistoricoEquipeModal(): void {
    this.showHistoricoEquipeModal = false;
  }

  openEncerrarEquipeModal(item: EquipeContrato): void {
    if (!this.canManageContratoActions) {
      return;
    }

    this.encerrandoEquipe = item;
    this.motivoExclusaoEquipe = '';
    this.showEncerrarEquipeModal = true;
  }

  closeEncerrarEquipeModal(): void {
    this.showEncerrarEquipeModal = false;
    this.encerrandoEquipe = null;
    this.motivoExclusaoEquipe = '';
  }

  openPortariaModal(portaria?: Portaria): void {
    if (portaria && !this.canManageContratoActions) {
      return;
    }

    if (!portaria && !this.canManageContratoActions) {
      return;
    }

    this.editingPortariaId = portaria?.id || null;
    this.portariaForm = portaria ? this.mapPortariaToForm(portaria) : this.createPortariaForm();
    this.showPortariaModal = true;
  }

  openNotificacaoModal(notificacao?: Notificacao): void {
    if (notificacao && !this.canManageContratoActions) {
      return;
    }

    if (!notificacao && !this.canManageContratoActions) {
      return;
    }

    this.editingNotificacaoId = notificacao?.id || null;
    this.notificacaoForm = notificacao ? this.mapNotificacaoToForm(notificacao) : this.createNotificacaoForm();
    this.showNotificacaoModal = true;
  }

  closeNotificacaoModal(): void {
    this.showNotificacaoModal = false;
    this.editingNotificacaoId = null;
    this.notificacaoForm = this.createNotificacaoForm();
  }

  openNotificacaoRespostaModal(notificacao: Notificacao): void {
    if (!this.canManageContratoActions) {
      return;
    }

    this.notificacaoRespondendo = notificacao;
    this.notificacaoRespostaForm = {
      idSeiResposta: notificacao.idSeiResposta || '',
      dataResposta: notificacao.dataResposta?.slice(0, 10) || '',
    };
    this.showNotificacaoRespostaModal = true;
  }

  closeNotificacaoRespostaModal(): void {
    this.showNotificacaoRespostaModal = false;
    this.notificacaoRespondendo = null;
    this.notificacaoRespostaForm = {
      idSeiResposta: '',
      dataResposta: '',
    };
  }

  closePortariaModal(): void {
    this.showPortariaModal = false;
    this.editingPortariaId = null;
    this.portariaForm = this.createPortariaForm();
  }

  openAditivoDetails(aditivo: Aditivo): void {
    this.openRecordDetails(`Aditivo ${aditivo.numero}`, [
      { label: 'ID Sei', value: aditivo.idSei || '-', copyValue: aditivo.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Tipo', value: this.getTipoAditivoLabel(aditivo.tipo) },
      { label: 'Data', value: this.formatDate(aditivo.dataInicio) },
      { label: 'Nova vigência', value: this.formatDate(aditivo.novaVigencia) },
      { label: 'Valor', value: this.formatCurrency(aditivo.valor) },
      { label: 'Observação', value: aditivo.observacao || '-' },
    ]);
  }

  openProcessoDetails(processo: ProcessoPagamento): void {
    this.openRecordDetails(`Processo ${processo.numeroProcesso}`, [
      {
        label: 'Número Processo SEI',
        value: processo.numeroProcesso || '-',
        copyValue: processo.numeroProcesso || '',
        copyLabel: 'Número Processo SEI'
      },
      { label: 'Observações', value: processo.observacoes || '-' },
      { label: 'Notas fiscais', value: `${this.countNotasByProcesso(processo.id)}` },
    ]);
  }

  openEmpenhoDetails(empenho: Empenho): void {
    const cancelamentos = this.getRestosPagarByEmpenho(empenho.id);

    this.openRecordDetails(`Empenho ${empenho.numeroEmpenho}`, [
      { label: 'ID Sei', value: empenho.idSei || '-', copyValue: empenho.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Data', value: this.formatDate(empenho.dataEmpenho) },
      { label: 'Fonte', value: empenho.fonte || '-' },
      { label: 'Empenhado', value: this.formatCurrency(empenho.valorEmpenhado) },
      { label: 'Cancelado em restos a pagar', value: this.formatCurrency(this.getTotalCanceladoByEmpenho(empenho.id)) },
      { label: 'Observação', value: empenho.observacao || '-', fullWidth: true },
      {
        label: 'Detalhes dos cancelamentos',
        value: cancelamentos.length > 0 ? '' : '-',
        tableColumns: ['Número nota de lançamento', 'ID Sei', 'Data', 'Valor'],
        tableRows: cancelamentos.map((item) => [
          { value: item.numeroNotaLancamento || '-' },
          {
            value: item.idSei || '-',
            copyValue: item.idSei || '',
          },
          { value: this.formatDate(item.data) },
          { value: this.formatCurrency(item.valor), align: 'end' },
        ]),
        fullWidth: true,
      },
    ]);
  }

  openNotaFiscalDetails(notaFiscal: NotaFiscal): void {
    this.openRecordDetails(`Nota fiscal ${notaFiscal.numero}`, [
      {
        label: 'Processo',
        value: notaFiscal.processoPagamentoNumero || '-',
        copyValue: notaFiscal.processoPagamentoNumero || '',
        copyLabel: 'Número Processo SEI'
      },
      { label: 'Número', value: notaFiscal.numero || '-' },
      { label: 'Série', value: notaFiscal.serie || '-' },
      { label: 'Referência', value: notaFiscal.referencia || '-' },
      { label: 'ID Sei', value: notaFiscal.idSei || '-', copyValue: notaFiscal.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Emissão', value: this.formatDate(notaFiscal.dataEmissao) },
      { label: 'Valor', value: this.formatCurrency(notaFiscal.valor) },
      { label: 'Glosado', value: this.formatCurrency(this.getTotalGlosadoByNotaFiscal(notaFiscal.id)) },
      { label: 'Saldo líquido', value: this.formatCurrency(this.getSaldoDisponivelNotaFiscal(notaFiscal.id)) },
      { label: 'Base de cálculo', value: this.formatCurrency(notaFiscal.baseCalculo) },
      { label: 'INSS', value: this.formatCurrency(notaFiscal.inss) },
      { label: 'ISS', value: this.formatCurrency(notaFiscal.iss) },
      { label: 'IRRF', value: this.formatCurrency(notaFiscal.irrf) },
    ], this.isNotaFiscalLiquidada(notaFiscal.id) ? 'Liquidada' : 'Disponível');
  }

  openLiquidacaoDetails(liquidacao: Liquidacao): void {
    this.openRecordDetails(`Liquidação ${this.getNotaFiscalNumero(liquidacao.notaFiscalId)}`, [
      { label: 'Nota fiscal', value: this.getNotaFiscalNumero(liquidacao.notaFiscalId) },
      { label: 'Número liquidação', value: liquidacao.numeroLiquidacao || '-' },
      { label: 'ID Sei', value: liquidacao.idSei || '-', copyValue: liquidacao.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Data', value: this.formatDate(liquidacao.dataLiquidacao) },
      { label: 'Valor', value: this.formatCurrency(liquidacao.valorLiquidado) },
      { label: 'Observação', value: liquidacao.observacao || '-' },
    ]);
  }

  openPagamentoDetails(pagamento: Pagamento): void {
    this.openRecordDetails(`Pagamento ${pagamento.numeroOrdemBancaria || this.getPagamentoNotaFiscalLabel(pagamento)}`, [
      { label: 'Liquidação', value: this.getPagamentoLiquidacaoLabel(pagamento) },
      { label: 'Nota fiscal', value: this.getPagamentoNotaFiscalLabel(pagamento) },
      { label: 'Número ordem bancária', value: pagamento.numeroOrdemBancaria || '-' },
      {
        label: 'ID Sei ordem bancária',
        value: pagamento.idSeiOrdemBancaria || '-',
        copyValue: pagamento.idSeiOrdemBancaria || '',
        copyLabel: 'ID Sei ordem bancária'
      },
      { label: 'Valor ordem bancária', value: this.formatCurrency(pagamento.valorOrdemBancaria) },
      { label: 'Data ordem bancária', value: this.formatDate(pagamento.dataOrdemBancaria) },
      { label: 'Número preparação pagamento', value: pagamento.numeroPreparacaoPagamento || '-' },
      {
        label: 'ID Sei preparação pagamento',
        value: pagamento.idSeiPreparacaoPagamento || '-',
        copyValue: pagamento.idSeiPreparacaoPagamento || '',
        copyLabel: 'ID Sei preparação pagamento'
      },
      { label: 'Valor preparação pagamento', value: this.formatCurrency(pagamento.valorPreparacaoPagamento) },
      { label: 'Data preparação pagamento', value: this.formatDate(pagamento.dataPreparacaoPagamento) },
    ]);
  }

  openRestoPagarDetails(restoPagar: RestoPagar): void {
    this.openRecordDetails(`Resto a pagar ${restoPagar.numeroEmpenho}`, [
      { label: 'Empenho', value: restoPagar.numeroEmpenho || '-' },
      { label: 'Número nota de lançamento', value: restoPagar.numeroNotaLancamento || '-' },
      { label: 'ID Sei', value: restoPagar.idSei || '-', copyValue: restoPagar.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Data', value: this.formatDate(restoPagar.data) },
      { label: 'Valor', value: this.formatCurrency(restoPagar.valor) },
    ]);
  }

  openPortariaDetails(portaria: Portaria): void {
    this.openRecordDetails(`Portaria ${portaria.numeroPortaria}`, [
      { label: 'ID Sei', value: portaria.idSei || '-', copyValue: portaria.idSei || '', copyLabel: 'ID Sei' },
      { label: 'Descrição', value: portaria.descricao || '-' },
      { label: 'Publicação', value: this.formatDate(portaria.dataPublicacao) },
    ]);
  }

  openNotificacaoDetails(notificacao: Notificacao): void {
    this.openRecordDetails(`Notificação ${notificacao.titulo}`, [
      { label: 'Título', value: notificacao.titulo || '-' },
      { label: 'ID Sei', value: notificacao.idSei || '-', copyValue: notificacao.idSei || '', copyLabel: 'ID Sei' },
      {
        label: 'ID Sei da resposta',
        value: notificacao.idSeiResposta || '-',
        copyValue: notificacao.idSeiResposta || '',
        copyLabel: 'ID Sei da resposta'
      },
      { label: 'Data da notificação', value: this.formatDate(notificacao.dataNotificacao) },
      { label: 'Data da resposta', value: this.formatDate(notificacao.dataResposta) },
      { label: 'Descrição', value: notificacao.descricao || '-' },
    ], notificacao.pendenteResposta ? 'Sem Resposta' : 'Respondida', notificacao.pendenteResposta);
  }

  openEquipeDetails(item: EquipeContrato): void {
    this.openRecordDetails(`Equipe ${item.usuarioNome || item.usuarioId}`, [
      { label: 'Usuário', value: item.usuarioNome || item.usuarioId || '-' },
      { label: 'Função', value: item.funcao === 2 ? 'Gestor' : 'Fiscal' },
      { label: 'Substituto', value: item.ehSubstituto ? 'Sim' : 'Não' },
      { label: 'Portaria', value: item.portariaNumero || '-' },
      { label: 'Inclusão', value: this.formatDate(item.dataInclusao) },
      { label: 'Status', value: item.dataExclusao ? 'Encerrado' : 'Ativo' },
    ]);
  }

  closeRecordDetailsModal(): void {
    this.showRecordDetailsModal = false;
    this.recordDetailsTitle = '';
    this.recordDetailsFields = [];
    this.recordDetailsStatus = '';
    this.recordDetailsStatusAlert = false;
  }

  onModalOverlayPointerDown(event: MouseEvent): void {
    this.overlayPointerDownOutside = event.target === event.currentTarget;
  }

  onModalOverlayPointerUp(event: MouseEvent, modal:
    | 'record-details'
    | 'aditivo'
    | 'processo'
    | 'empenho'
    | 'nota-fiscal'
    | 'glosa-nota-fiscal'
    | 'liquidacao'
    | 'pagamento'
    | 'resto-pagar'
    | 'equipe'
    | 'historico-equipe'
    | 'encerrar-equipe'
    | 'notificacao'
    | 'notificacao-resposta'
    | 'portaria'): void {
    const shouldClose = this.overlayPointerDownOutside && event.target === event.currentTarget;
    this.overlayPointerDownOutside = false;

    if (!shouldClose) {
      return;
    }

    switch (modal) {
      case 'record-details':
        this.closeRecordDetailsModal();
        break;
      case 'aditivo':
        this.closeAditivoModal();
        break;
      case 'processo':
        this.closeProcessoPagamentoModal();
        break;
      case 'empenho':
        this.closeEmpenhoModal();
        break;
      case 'nota-fiscal':
        this.closeNotaFiscalModal();
        break;
      case 'glosa-nota-fiscal':
        this.closeGlosaNotaFiscalModal();
        break;
      case 'liquidacao':
        this.closeLiquidacaoModal();
        break;
      case 'pagamento':
        this.closePagamentoModal();
        break;
      case 'resto-pagar':
        this.closeRestoPagarModal();
        break;
      case 'equipe':
        this.closeEquipeModal();
        break;
      case 'historico-equipe':
        this.closeHistoricoEquipeModal();
        break;
      case 'encerrar-equipe':
        this.closeEncerrarEquipeModal();
        break;
      case 'notificacao':
        this.closeNotificacaoModal();
        break;
      case 'notificacao-resposta':
        this.closeNotificacaoRespostaModal();
        break;
      case 'portaria':
        this.closePortariaModal();
        break;
    }
  }

  submitAditivo(): void {
    this.savingAditivo = true;
    const isEditing = !!this.editingAditivoId;

    const isRenovacao = this.aditivoForm.tipo === TipoAditivo.Renovacao;
    const payload: AditivoPayload = {
      ...this.aditivoForm,
      contratoId: this.contratoId,
      valor: isRenovacao ? 0 : Number(this.aditivoForm.valor || 0),
      novaVigencia: isRenovacao ? (this.aditivoForm.novaVigencia || null) : null,
    };
    const request = this.editingAditivoId
      ? this.aditivoService.update(this.editingAditivoId, payload)
      : this.aditivoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingAditivo = false;
        this.closeAditivoModal();
        this.toastr.success(isEditing ? 'Aditivo atualizado com sucesso.' : 'Aditivo cadastrado com sucesso.');
        this.loadDetails();
      },
      error: (error: HttpErrorResponse) => {
        this.savingAditivo = false;
        this.toastr.error(error.error?.message || 'Não foi possível cadastrar o aditivo.');
      },
    });
  }

  submitProcessoPagamento(): void {
    this.savingProcessoPagamento = true;
    const isEditing = !!this.editingProcessoPagamentoId;
    const payload: ProcessoPagamentoPayload = {
      ...this.processoPagamentoForm,
      observacoes: this.processoPagamentoForm.observacoes || null,
    };
    const request = this.editingProcessoPagamentoId
      ? this.processoPagamentoService.update(this.editingProcessoPagamentoId, payload)
      : this.processoPagamentoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingProcessoPagamento = false;
        this.closeProcessoPagamentoModal();
        this.toastr.success(
          isEditing
            ? 'Processo de pagamento atualizado com sucesso.'
            : 'Processo de pagamento cadastrado com sucesso.'
        );
        this.loadDetails();
      },
      error: () => {
        this.savingProcessoPagamento = false;
        this.toastr.error('Não foi possível cadastrar o processo de pagamento.');
      },
    });
  }

  submitEmpenho(): void {
    this.savingEmpenho = true;
    const isEditing = !!this.editingEmpenhoId;
    const payload: EmpenhoPayload = {
      ...this.empenhoForm,
      valorEmpenhado: Number(this.empenhoForm.valorEmpenhado),
    };
    const request = this.editingEmpenhoId
      ? this.empenhoService.update(this.editingEmpenhoId, payload)
      : this.empenhoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingEmpenho = false;
        this.closeEmpenhoModal();
        this.toastr.success(isEditing ? 'Empenho atualizado com sucesso.' : 'Empenho cadastrado com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingEmpenho = false;
        this.toastr.error('Não foi possível cadastrar o empenho.');
      },
    });
  }

  submitNotaFiscal(): void {
    this.savingNotaFiscal = true;
    const isEditing = !!this.editingNotaFiscalId;
    const payload: NotaFiscalPayload = {
      ...this.notaFiscalForm,
      valor: Number(this.notaFiscalForm.valor),
      baseCalculo: Number(this.notaFiscalForm.baseCalculo),
      inss: Number(this.notaFiscalForm.inss),
      iss: Number(this.notaFiscalForm.iss),
      irrf: Number(this.notaFiscalForm.irrf),
    };
    const request = this.editingNotaFiscalId
      ? this.notaFiscalService.update(this.editingNotaFiscalId, payload)
      : this.notaFiscalService.create(payload);

    request.subscribe({
      next: () => {
        this.savingNotaFiscal = false;
        this.closeNotaFiscalModal();
        this.toastr.success(isEditing ? 'Nota fiscal atualizada com sucesso.' : 'Nota fiscal cadastrada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingNotaFiscal = false;
        this.toastr.error('Não foi possível cadastrar a nota fiscal.');
      },
    });
  }

  submitLiquidacao(): void {
    if (this.liquidacaoInvalida) {
      this.toastr.error('O valor informado excede o limite permitido para a liquidação.');
      return;
    }

    this.savingLiquidacao = true;
    const isEditing = !!this.editingLiquidacaoId;
    const payload: LiquidacaoPayload = {
      ...this.liquidacaoForm,
      valorLiquidado: Number(this.liquidacaoForm.valorLiquidado),
    };
    const request = this.editingLiquidacaoId
      ? this.liquidacaoService.update(this.editingLiquidacaoId, payload)
      : this.liquidacaoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingLiquidacao = false;
        this.closeLiquidacaoModal();
        this.toastr.success(isEditing ? 'Liquidação atualizada com sucesso.' : 'Liquidação cadastrada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingLiquidacao = false;
        this.toastr.error('Não foi possível cadastrar a liquidação.');
      },
    });
  }

  submitPagamento(): void {
    if (this.pagamentoPreparacaoIncompleta) {
      this.toastr.error('Quando houver preparação de pagamento, número, ID Sei, data e valor devem ser informados.');
      return;
    }

    if (this.pagamentoTotalInvalido) {
      this.toastr.error('A soma da ordem bancária com a preparação de pagamento deve ser igual ao valor liquidado.');
      return;
    }

    this.savingPagamento = true;
    const isEditing = !!this.editingPagamentoId;
    const payload: PagamentoPayload = {
      ...this.pagamentoForm,
      valorOrdemBancaria: Number(this.pagamentoForm.valorOrdemBancaria),
      valorPreparacaoPagamento: Number(this.pagamentoForm.valorPreparacaoPagamento),
      dataPreparacaoPagamento: this.pagamentoTemPreparacaoInformada
        ? (this.pagamentoForm.dataPreparacaoPagamento || null)
        : null,
    };
    const request = this.editingPagamentoId
      ? this.pagamentoService.update(this.editingPagamentoId, payload)
      : this.pagamentoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingPagamento = false;
        this.closePagamentoModal();
        this.toastr.success(isEditing ? 'Pagamento atualizado com sucesso.' : 'Pagamento cadastrado com sucesso.');
        this.loadDetails();
      },
      error: (error: HttpErrorResponse) => {
        this.savingPagamento = false;
        this.toastr.error(error.error?.message || 'Não foi possível cadastrar o pagamento.');
      },
    });
  }

  submitRestoPagar(): void {
    this.savingRestoPagar = true;
    const isEditing = !!this.editingRestoPagarId;
    const payload: RestoPagarPayload = {
      ...this.restoPagarForm,
      valor: Number(this.restoPagarForm.valor),
    };
    const request = this.editingRestoPagarId
      ? this.restoPagarService.update(this.editingRestoPagarId, payload)
      : this.restoPagarService.create(payload);

    request.subscribe({
      next: () => {
        this.savingRestoPagar = false;
        this.closeRestoPagarModal();
        this.toastr.success(isEditing ? 'Resto a pagar atualizado com sucesso.' : 'Resto a pagar cadastrado com sucesso.');
        this.loadDetails();
      },
      error: (error: HttpErrorResponse) => {
        this.savingRestoPagar = false;
        this.toastr.error(error.error?.message || 'Não foi possível cadastrar o resto a pagar.');
      },
    });
  }

  submitGlosaNotaFiscal(): void {
    if (this.glosaInvalida) {
      this.toastr.error('O valor informado excede o limite disponível para glosa nesta nota fiscal.');
      return;
    }

    this.savingGlosaNotaFiscal = true;
    const isEditing = !!this.editingGlosaNotaFiscalId;
    const payload: GlosaNotaFiscalPayload = {
      ...this.glosaNotaFiscalForm,
      valorGlosa: Number(this.glosaNotaFiscalForm.valorGlosa),
      descricao: this.glosaNotaFiscalForm.descricao || null,
    };
    const request = this.editingGlosaNotaFiscalId
      ? this.glosaNotaFiscalService.update(this.editingGlosaNotaFiscalId, payload)
      : this.glosaNotaFiscalService.create(payload);

    request.subscribe({
      next: () => {
        this.savingGlosaNotaFiscal = false;
        this.closeGlosaNotaFiscalModal();
        this.toastr.success(isEditing ? 'Glosa atualizada com sucesso.' : 'Glosa cadastrada com sucesso.');
        this.loadDetails();
      },
      error: (error: HttpErrorResponse) => {
        this.savingGlosaNotaFiscal = false;
        this.toastr.error(error.error?.message || 'Não foi possível cadastrar a glosa.');
      },
    });
  }

  submitEquipe(): void {
    this.savingEquipe = true;
    const isEditing = !!this.editingEquipeId;
    const payload: EquipeContratoPayload = {
      ...this.equipeForm,
      contratoId: this.contratoId,
      portariaId: this.equipeForm.portariaId || null,
      dataInclusao: this.editingEquipeId ? this.equipeForm.dataInclusao || null : null,
      dataExclusao: this.editingEquipeId ? this.equipeForm.dataExclusao || null : null,
      motivoExclusao: this.editingEquipeId ? this.equipeForm.motivoExclusao || null : null,
    };
    const request = this.editingEquipeId
      ? this.equipeContratoService.update(this.editingEquipeId, payload)
      : this.equipeContratoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingEquipe = false;
        this.closeEquipeModal();
        this.toastr.success(isEditing ? 'Integrante atualizado com sucesso.' : 'Integrante da equipe cadastrado com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingEquipe = false;
        this.toastr.error('Não foi possível cadastrar o integrante da equipe.');
      },
    });
  }

  submitEncerrarEquipe(): void {
    if (!this.encerrandoEquipe) {
      return;
    }

    this.savingEncerramentoEquipe = true;
    this.equipeContratoService.update(this.encerrandoEquipe.id, {
      contratoId: this.encerrandoEquipe.contratoId,
      usuarioId: this.encerrandoEquipe.usuarioId,
      portariaId: this.encerrandoEquipe.portariaId || null,
      funcao: this.encerrandoEquipe.funcao,
      ehSubstituto: this.encerrandoEquipe.ehSubstituto,
      dataInclusao: this.encerrandoEquipe.dataInclusao,
      dataExclusao: new Date().toISOString().slice(0, 10),
      motivoExclusao: this.motivoExclusaoEquipe || null,
    }).subscribe({
      next: () => {
        this.savingEncerramentoEquipe = false;
        this.closeEncerrarEquipeModal();
        this.toastr.success('Participação na equipe encerrada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingEncerramentoEquipe = false;
        this.toastr.error('Não foi possível encerrar a participação na equipe.');
      },
    });
  }

  submitPortaria(): void {
    this.savingPortaria = true;
    const isEditing = !!this.editingPortariaId;
    const payload: PortariaPayload = {
      ...this.portariaForm,
      contratoId: this.contratoId,
    };
    const request = this.editingPortariaId
      ? this.portariaService.update(this.editingPortariaId, payload)
      : this.portariaService.create(payload);

    request.subscribe({
      next: () => {
        this.savingPortaria = false;
        this.closePortariaModal();
        this.toastr.success(isEditing ? 'Portaria atualizada com sucesso.' : 'Portaria cadastrada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingPortaria = false;
        this.toastr.error('Não foi possível cadastrar a portaria.');
      },
    });
  }

  submitNotificacao(): void {
    this.savingNotificacao = true;
    const isEditing = !!this.editingNotificacaoId;
    const payload: NotificacaoPayload = {
      ...this.notificacaoForm,
      contratoId: this.contratoId,
      idSeiResposta: this.notificacaoForm.idSeiResposta || null,
      dataResposta: this.notificacaoForm.idSeiResposta ? (this.notificacaoForm.dataResposta || null) : null,
    };
    const request = this.editingNotificacaoId
      ? this.notificacaoService.update(this.editingNotificacaoId, payload)
      : this.notificacaoService.create(payload);

    request.subscribe({
      next: () => {
        this.savingNotificacao = false;
        this.closeNotificacaoModal();
        this.toastr.success(isEditing ? 'Notificação atualizada com sucesso.' : 'Notificação cadastrada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingNotificacao = false;
        this.toastr.error('Não foi possível cadastrar a notificação.');
      },
    });
  }

  submitNotificacaoResposta(): void {
    if (!this.notificacaoRespondendo) {
      return;
    }

    this.savingNotificacaoResposta = true;
    const notificacao = this.notificacaoRespondendo;
    const payload: NotificacaoPayload = {
      contratoId: notificacao.contratoId,
      titulo: notificacao.titulo,
      descricao: notificacao.descricao || null,
      idSei: notificacao.idSei,
      dataNotificacao: notificacao.dataNotificacao,
      idSeiResposta: this.notificacaoRespostaForm.idSeiResposta || null,
      dataResposta: this.notificacaoRespostaForm.idSeiResposta ? this.notificacaoRespostaForm.dataResposta : null,
    };

    this.notificacaoService.update(notificacao.id, payload).subscribe({
      next: () => {
        this.savingNotificacaoResposta = false;
        this.closeNotificacaoRespostaModal();
        this.toastr.success('Resposta vinculada com sucesso.');
        this.loadDetails();
      },
      error: () => {
        this.savingNotificacaoResposta = false;
        this.toastr.error('Não foi possível vincular a resposta.');
      },
    });
  }

  private createAditivoForm(): AditivoPayload {
    return {
      contratoId: this.contratoId,
      numero: '',
      idSei: '',
      tipo: TipoAditivo.Renovacao,
      observacao: '',
      dataInicio: '',
      novaVigencia: '',
      valor: 0,
    };
  }

  private mapAditivoToForm(aditivo: Aditivo): AditivoPayload {
    return {
      contratoId: this.contratoId,
      numero: aditivo.numero,
      idSei: aditivo.idSei,
      tipo: aditivo.tipo,
      observacao: aditivo.observacao || '',
      dataInicio: aditivo.dataInicio?.slice(0, 10) || '',
      novaVigencia: aditivo.novaVigencia?.slice(0, 10) || '',
      valor: Number(aditivo.valor || 0),
    };
  }

  private createProcessoPagamentoForm(): ProcessoPagamentoPayload {
    return {
      exercicioAnualId: this.selectedExercicioId || this.exercicios[0]?.id || '',
      numeroProcesso: '',
      observacoes: '',
    };
  }

  private mapProcessoPagamentoToForm(processo: ProcessoPagamento): ProcessoPagamentoPayload {
    return {
      exercicioAnualId: processo.exercicioAnualId,
      numeroProcesso: processo.numeroProcesso,
      observacoes: processo.observacoes || '',
    };
  }

  private createEmpenhoForm(): EmpenhoPayload {
    return {
      exercicioAnualId: this.selectedExercicioId || this.exercicios[0]?.id || '',
      numeroEmpenho: '',
      idSei: '',
      dataEmpenho: '',
      valorEmpenhado: 0,
      fonte: '',
      observacao: '',
    };
  }

  private mapEmpenhoToForm(empenho: Empenho): EmpenhoPayload {
    return {
      exercicioAnualId: empenho.exercicioAnualId,
      numeroEmpenho: empenho.numeroEmpenho,
      idSei: empenho.idSei,
      dataEmpenho: empenho.dataEmpenho?.slice(0, 10) || '',
      valorEmpenhado: Number(empenho.valorEmpenhado || 0),
      fonte: empenho.fonte,
      observacao: empenho.observacao || '',
    };
  }

  private createNotaFiscalForm(): NotaFiscalPayload {
    return {
      processoPagamentoId: this.processosPagamentoDoExercicio[0]?.id || '',
      numero: '',
      serie: '',
      referencia: '',
      idSei: '',
      dataEmissao: '',
      valor: 0,
      baseCalculo: 0,
      inss: 0,
      iss: 0,
      irrf: 0,
    };
  }

  private mapNotaFiscalToForm(notaFiscal: NotaFiscal): NotaFiscalPayload {
    return {
      processoPagamentoId: notaFiscal.processoPagamentoId,
      numero: notaFiscal.numero,
      serie: notaFiscal.serie,
      referencia: notaFiscal.referencia || '',
      idSei: notaFiscal.idSei,
      dataEmissao: notaFiscal.dataEmissao?.slice(0, 10) || '',
      valor: Number(notaFiscal.valor || 0),
      baseCalculo: Number(notaFiscal.baseCalculo || 0),
      inss: Number(notaFiscal.inss || 0),
      iss: Number(notaFiscal.iss || 0),
      irrf: Number(notaFiscal.irrf || 0),
    };
  }

  private createLiquidacaoForm(): LiquidacaoPayload {
    return {
      notaFiscalId: String(this.notaFiscalOptions[0]?.value || ''),
      numeroLiquidacao: '',
      idSei: '',
      dataLiquidacao: '',
      valorLiquidado: 0,
      observacao: '',
    };
  }

  private createPagamentoForm(): PagamentoPayload {
    return {
      liquidacaoId: String(this.liquidacaoSemPagamentoOptions[0]?.value || ''),
      numeroOrdemBancaria: '',
      idSeiOrdemBancaria: '',
      valorOrdemBancaria: 0,
      dataOrdemBancaria: '',
      numeroPreparacaoPagamento: '',
      idSeiPreparacaoPagamento: '',
      valorPreparacaoPagamento: 0,
      dataPreparacaoPagamento: '',
    };
  }

  private createRestoPagarForm(): RestoPagarPayload {
    return {
      empenhoId: this.empenhoComSaldoParaRestoPagar?.id || '',
      numeroNotaLancamento: '',
      idSei: '',
      data: '',
      valor: this.valorSugeridoRestoPagar,
    };
  }

  private createGlosaNotaFiscalForm(notaFiscalId = ''): GlosaNotaFiscalPayload {
    return {
      notaFiscalId,
      idSei: '',
      valorGlosa: 0,
      dataGlosa: '',
      descricao: '',
    };
  }

  private mapGlosaNotaFiscalToForm(glosa: GlosaNotaFiscal): GlosaNotaFiscalPayload {
    return {
      notaFiscalId: glosa.notaFiscalId,
      idSei: glosa.idSei,
      valorGlosa: Number(glosa.valorGlosa || 0),
      dataGlosa: glosa.dataGlosa?.slice(0, 10) || '',
      descricao: glosa.descricao || '',
    };
  }

  private mapLiquidacaoToForm(liquidacao: Liquidacao): LiquidacaoPayload {
    return {
      notaFiscalId: liquidacao.notaFiscalId,
      numeroLiquidacao: liquidacao.numeroLiquidacao || '',
      idSei: liquidacao.idSei,
      dataLiquidacao: liquidacao.dataLiquidacao?.slice(0, 10) || '',
      valorLiquidado: Number(liquidacao.valorLiquidado || 0),
      observacao: liquidacao.observacao || '',
    };
  }

  private mapPagamentoToForm(pagamento: Pagamento): PagamentoPayload {
    return {
      liquidacaoId: pagamento.liquidacaoId,
      numeroOrdemBancaria: pagamento.numeroOrdemBancaria || '',
      idSeiOrdemBancaria: pagamento.idSeiOrdemBancaria || '',
      valorOrdemBancaria: Number(pagamento.valorOrdemBancaria || 0),
      dataOrdemBancaria: pagamento.dataOrdemBancaria?.slice(0, 10) || '',
      numeroPreparacaoPagamento: pagamento.numeroPreparacaoPagamento || '',
      idSeiPreparacaoPagamento: pagamento.idSeiPreparacaoPagamento || '',
      valorPreparacaoPagamento: Number(pagamento.valorPreparacaoPagamento || 0),
      dataPreparacaoPagamento: pagamento.dataPreparacaoPagamento?.slice(0, 10) || '',
    };
  }

  private mapRestoPagarToForm(restoPagar: RestoPagar): RestoPagarPayload {
    return {
      empenhoId: restoPagar.empenhoId,
      numeroNotaLancamento: restoPagar.numeroNotaLancamento || '',
      idSei: restoPagar.idSei || '',
      data: restoPagar.data?.slice(0, 10) || '',
      valor: Number(restoPagar.valor || 0),
    };
  }

  private createEquipeForm(): EquipeContratoPayload {
    return {
      contratoId: this.contratoId,
      usuarioId: this.usuariosResponsaveis[0]?.id || '',
      portariaId: null,
      funcao: FuncaoEquipeContrato.Gestor,
      ehSubstituto: false,
      dataInclusao: null,
      dataExclusao: null,
      motivoExclusao: null,
    };
  }

  private mapEquipeToForm(item: EquipeContrato): EquipeContratoPayload {
    return {
      contratoId: this.contratoId,
      usuarioId: item.usuarioId,
      portariaId: item.portariaId || null,
      funcao: item.funcao,
      ehSubstituto: item.ehSubstituto,
      dataInclusao: item.dataInclusao?.slice(0, 10) || null,
      dataExclusao: item.dataExclusao?.slice(0, 10) || null,
      motivoExclusao: item.motivoExclusao || null,
    };
  }

  private createPortariaForm(): PortariaPayload {
    return {
      contratoId: this.contratoId,
      numeroPortaria: '',
      idSei: '',
      descricao: '',
      dataPublicacao: '',
    };
  }

  private createNotificacaoForm(): NotificacaoPayload {
    return {
      contratoId: this.contratoId,
      titulo: '',
      descricao: '',
      idSei: '',
      dataNotificacao: '',
      idSeiResposta: '',
      dataResposta: '',
    };
  }

  private mapNotificacaoToForm(notificacao: Notificacao): NotificacaoPayload {
    return {
      contratoId: this.contratoId,
      titulo: notificacao.titulo,
      descricao: notificacao.descricao || '',
      idSei: notificacao.idSei,
      dataNotificacao: notificacao.dataNotificacao?.slice(0, 10) || '',
      idSeiResposta: notificacao.idSeiResposta || '',
      dataResposta: notificacao.dataResposta?.slice(0, 10) || '',
    };
  }

  private mapPortariaToForm(portaria: Portaria): PortariaPayload {
    return {
      contratoId: this.contratoId,
      numeroPortaria: portaria.numeroPortaria,
      idSei: portaria.idSei,
      descricao: portaria.descricao || '',
      dataPublicacao: portaria.dataPublicacao?.slice(0, 10) || '',
    };
  }

  private loadDetails(): void {
    this.loading = true;
    this.referenceTimestamp = Date.now();
    const usuariosResponsaveisRequest = this.authService.getContratoUsers();

    forkJoin({
      contrato: this.contratoService.getById(this.contratoId),
      aditivos: this.aditivoService.getAll(),
      exercicios: this.exercicioAnualService.getAll(),
      processosPagamento: this.processoPagamentoService.getAll(),
      empenhos: this.empenhoService.getAll(),
      notasFiscais: this.notaFiscalService.getAll(),
      glosasNotasFiscais: this.glosaNotaFiscalService.getAll(),
      liquidacoes: this.liquidacaoService.getAll(),
      pagamentos: this.pagamentoService.getAll(),
      restosPagar: this.restoPagarService.getAll(),
      equipe: this.equipeContratoService.getAll(),
      notificacoes: this.notificacaoService.getAll(),
      portarias: this.portariaService.getAll(),
      usuariosResponsaveis: usuariosResponsaveisRequest,
    }).subscribe({
      next: ({ contrato, aditivos, exercicios, processosPagamento, empenhos, notasFiscais, glosasNotasFiscais, liquidacoes, pagamentos, restosPagar, equipe, notificacoes, portarias, usuariosResponsaveis }) => {
        this.contrato = contrato;
        this.pageTitleService.setPageTitle(`Contrato ${contrato.numero}`);
        this.aditivos = aditivos
          .filter((item) => item.contratoId === this.contratoId)
          .sort((a, b) => a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true, sensitivity: 'base' }));
        this.exercicios = exercicios.filter((item) => item.contratoId === this.contratoId).sort((a, b) => a.ano - b.ano);
        this.processosPagamento = processosPagamento.filter((item) => item.contratoId === this.contratoId);
        this.empenhos = empenhos.filter((item) => item.contratoId === this.contratoId);
        this.notasFiscais = notasFiscais.filter((item) => item.contratoId === this.contratoId);
        const notaFiscalIds = new Set(this.notasFiscais.map((item) => item.id));
        this.glosasNotasFiscais = glosasNotasFiscais.filter((item) => notaFiscalIds.has(item.notaFiscalId));
        this.equipe = equipe.filter((item) => item.contratoId === this.contratoId);
        this.notificacoes = notificacoes.filter((item) => item.contratoId === this.contratoId);
        this.portarias = portarias.filter((item) => item.contratoId === this.contratoId);
        this.restosPagar = restosPagar.filter((item) => item.contratoId === this.contratoId);
        this.usuariosResponsaveis = usuariosResponsaveis;

        this.liquidacoes = liquidacoes.filter((item) => notaFiscalIds.has(item.notaFiscalId));
        const liquidacaoIds = new Set(this.liquidacoes.map((item) => item.id));
        this.pagamentos = pagamentos.filter((item) => liquidacaoIds.has(item.liquidacaoId));

        const exercicioAnoAtual = this.exercicios.find((item) => item.ano === new Date().getFullYear());
        this.selectedExercicioId = this.selectedExercicioId || exercicioAnoAtual?.id || this.exercicios[0]?.id || '';
        this.processoPagamentoForm.exercicioAnualId = this.processoPagamentoForm.exercicioAnualId || this.exercicios[0]?.id || '';
        this.empenhoForm.exercicioAnualId = this.empenhoForm.exercicioAnualId || this.exercicios[0]?.id || '';
        this.notaFiscalForm.processoPagamentoId = this.processosPagamentoDoExercicio.some(
          (item) => item.id === this.notaFiscalForm.processoPagamentoId
        )
          ? this.notaFiscalForm.processoPagamentoId
          : this.processosPagamentoDoExercicio[0]?.id || '';
        this.glosaNotaFiscalForm.notaFiscalId = this.notasFiscaisDoExercicio.some(
          (item) => item.id === this.glosaNotaFiscalForm.notaFiscalId
        )
          ? this.glosaNotaFiscalForm.notaFiscalId
          : this.notasFiscaisDoExercicio[0]?.id || '';
        this.liquidacaoForm.notaFiscalId = this.liquidacaoForm.notaFiscalId || String(this.notaFiscalOptions[0]?.value || '');
        this.pagamentoForm.liquidacaoId = this.liquidacaoSemPagamentoOptions.some(
          (item) => item.value === this.pagamentoForm.liquidacaoId
        )
          ? this.pagamentoForm.liquidacaoId
          : String(this.liquidacaoSemPagamentoOptions[0]?.value || '');
        this.restoPagarForm.empenhoId = this.restoPagarForm.empenhoId || this.empenhoComSaldoParaRestoPagar?.id || '';
        this.equipeForm.usuarioId = this.equipeForm.usuarioId || this.usuariosResponsaveis[0]?.id || '';
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;

        if (error.status === 404) {
          this.toastr.error('Contrato nao encontrado.');
          this.router.navigate(['/contratos']);
          return;
        }

        this.toastr.error('Não foi possível carregar os detalhes do contrato.');
      },
    });
  }

  private calculatePercentualPeriodo(inicio: number, fim: number): number {
    if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim <= inicio) {
      return 0;
    }

    if (this.referenceTimestamp <= inicio) {
      return 0;
    }

    if (this.referenceTimestamp >= fim) {
      return 100;
    }

    return ((this.referenceTimestamp - inicio) / (fim - inicio)) * 100;
  }

  private calculateSaldoDisponivelPorEmpenho(exercicioId: string, editingRestoPagarId?: string | null): Map<string, number> {
    const empenhosDoExercicio = [...this.empenhos]
      .filter((item) => item.exercicioAnualId === exercicioId)
      .sort((a, b) => {
        const dataCompare = new Date(a.dataEmpenho).getTime() - new Date(b.dataEmpenho).getTime();
        return dataCompare !== 0 ? dataCompare : a.numeroEmpenho.localeCompare(b.numeroEmpenho, 'pt-BR', { numeric: true });
      });

    const totalLiquidado = this.liquidacoes
      .filter((item) => {
        const nota = this.notasFiscais.find((notaFiscal) => notaFiscal.id === item.notaFiscalId);
        return nota?.exercicioAnualId === exercicioId;
      })
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);

    const totalRestos = this.restosPagar
      .filter((item) => item.exercicioAnualId === exercicioId && item.id !== editingRestoPagarId)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    let restanteComprometido = totalLiquidado + totalRestos;
    const saldos = new Map<string, number>();

    for (const empenho of empenhosDoExercicio) {
      const valorEmpenhado = Number(empenho.valorEmpenhado || 0);
      const consumido = Math.min(valorEmpenhado, Math.max(restanteComprometido, 0));
      saldos.set(empenho.id, valorEmpenhado - consumido);
      restanteComprometido = Math.max(restanteComprometido - valorEmpenhado, 0);
    }

    return saldos;
  }

  getTotalLiquidadoByNotaFiscal(notaFiscalId: string): number {
    return this.liquidacoes
      .filter((item) => item.notaFiscalId === notaFiscalId && item.id !== this.editingLiquidacaoId)
      .reduce((acc, item) => acc + Number(item.valorLiquidado || 0), 0);
  }

  getTotalGlosadoByNotaFiscal(notaFiscalId: string): number {
    return this.glosasNotasFiscais
      .filter((item) => item.notaFiscalId === notaFiscalId && item.id !== this.editingGlosaNotaFiscalId)
      .reduce((acc, item) => acc + Number(item.valorGlosa || 0), 0);
  }

  private copyToClipboardFallback(value: string, label: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (copied) {
      this.toastr.success(`${label} copiado.`);
      return;
    }

    this.toastr.error(`Não foi possível copiar ${label.toLowerCase()}.`);
  }

  private openRecordDetails(title: string, fields: DetailField[], status = '', statusAlert = false): void {
    this.recordDetailsTitle = title;
    this.recordDetailsFields = fields;
    this.recordDetailsStatus = status;
    this.recordDetailsStatusAlert = statusAlert;
    this.showRecordDetailsModal = true;
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
  }

  private formatCurrency(value?: number | string | null): string {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }
}
