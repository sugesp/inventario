import { Component, DoCheck, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import { finalize, switchMap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
import { LaudoTecnico, LaudoTecnicoPayload } from '../../contracts/laudo-tecnico.model';
import { LaudoTecnicoService } from '../../contracts/laudo-tecnico.service';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';

type LaudoStep = 'equipamento' | 'avaliacao' | 'viabilidade' | 'recomendacao' | 'fotos' | 'conclusao';

interface LaudoPhoto {
  categoria: string;
  file: File;
  previewUrl: string;
}

interface LaudoForm {
  processoSei: string;
  idDevolucaoSei: string;
  unidadeGestora: string;
  setor: string;
  dataAvaliacao: string;
  tipoEquipamento: string;
  outroTipoEquipamento: string;
  patrimonio: string;
  tombamentoAntigo: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  anoAquisicao: string;
  processador: string;
  memoria: string;
  armazenamento: string;
  sistemaOperacional: string;
  outros: string;
  condicaoFuncionamento: string;
  descricaoFuncionamento: string;
  estadoConservacao: string;
  problemasIdentificados: string[];
  outroProblema: string;
  descricaoTecnicaDetalhada: string;
  possuiReparo: 'SIM' | 'NAO' | '';
  descricaoReparo: string;
  valorEstimadoMercado: string;
  custoEstimadoManutencao: string;
  percentualEstimado: string;
  classificacaoTecnica: string;
  justificativaTecnica: string;
  recomendacoes: string[];
  sugestoesDestinacao: string[];
  registroFotografico: string[];
  quantidadeFotos: string;
  conclusaoCondicao: string;
  classificacaoFinal: string;
}

interface PersistedLaudoState {
  currentStep: LaudoStep;
  form: LaudoForm;
}

@Component({
  selector: 'app-laudo-tecnico',
  templateUrl: './laudo-tecnico.component.html',
  styleUrl: './laudo-tecnico.component.scss',
})
export class LaudoTecnicoComponent implements OnInit, DoCheck, OnDestroy {
  private static readonly QR_IMAGE_MAX_DIMENSION = 1600;
  private static readonly QR_SCAN_MAX_DIMENSION = 800;
  private static readonly QR_SCAN_CROP_WIDTH_RATIO = 0.9;
  private static readonly QR_SCAN_CROP_HEIGHT_RATIO = 0.65;
  private static readonly STORAGE_KEY = 'inventario.laudo-tecnico.state';

  @ViewChild('qrInput') qrInput?: ElementRef<HTMLInputElement>;
  @ViewChild('qrVideo') qrVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('photoVideo') photoVideo?: ElementRef<HTMLVideoElement>;

  readonly steps: Array<{ key: LaudoStep; label: string; hint: string }> = [
    { key: 'equipamento', label: 'Equipamento', hint: 'Bem avaliado' },
    { key: 'avaliacao', label: 'Avaliação', hint: 'Estado técnico' },
    { key: 'viabilidade', label: 'Viabilidade', hint: 'Reparo e estimativa' },
    { key: 'recomendacao', label: 'Recomendação', hint: 'Encaminhamento' },
    { key: 'fotos', label: 'Fotos', hint: 'Registro fotográfico' },
    { key: 'conclusao', label: 'Conclusão', hint: 'Fechamento' },
  ];

  readonly equipmentTypes = ['Computador', 'Notebook', 'Monitor', 'Impressora', 'Scanner', 'Nobreak', 'Outro'];
  readonly funcionamentoOptions = ['Funcionando normalmente', 'Funcionando parcialmente', 'Nao funciona'];
  readonly conservacaoOptions = ['Excelente', 'Bom', 'Regular', 'Pessimo'];
  readonly problemasOptions = [
    'Obsolescencia tecnologica',
    'Desgaste por tempo de uso',
    'Falha de hardware',
    'Falha de software',
    'Danos fisicos',
    'Pecas indisponiveis',
    'Outro',
  ];
  readonly classificacaoOptions = ['Ocioso', 'Recuperavel', 'Antieconomico', 'Irrecuperavel'];
  readonly recomendacaoOptions = ['Manutencao', 'Reaproveitamento interno', 'Encaminhar para desfazimento'];
  readonly destinacaoOptions = ['Doacao', 'Leilao', 'Descarte', 'Inutilizacao'];
  readonly registroFotograficoOptions = ['Equipamento completo', 'Etiqueta patrimonial', 'Defeitos identificados'];
  readonly conclusaoOptions = ['Servivel', 'Inservivel'];

  currentStep: LaudoStep = 'equipamento';
  saving = false;
  savedLaudo: LaudoTecnico | null = null;
  readingQrCode = false;
  qrScannerOpen = false;
  qrScannerStarting = false;
  qrScannerError = '';
  consultingPatrimonio = false;
  patrimonioMessage = '';
  selectedPhotoCategory = '';
  photos: LaudoPhoto[] = [];
  cameraOpen = false;
  cameraStarting = false;
  cameraCapturing = false;
  cameraError = '';
  private lastConsultedPatrimonio = '';
  private cameraStream: MediaStream | null = null;
  private qrScannerStream: MediaStream | null = null;
  private qrScannerFrameId: number | null = null;
  private qrScannerDetector: { detect(source: ImageBitmap): Promise<Array<{ rawValue?: string }>> } | null = null;
  private qrScannerCanvas: HTMLCanvasElement | null = null;
  private lastPersistedSnapshot = '';

  form: LaudoForm = this.createEmptyForm();

  constructor(
    readonly authService: AuthService,
    private readonly laudoTecnicoService: LaudoTecnicoService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.restoreState();
  }

  ngDoCheck(): void {
    const snapshot = JSON.stringify({
      currentStep: this.currentStep,
      form: this.form,
    });

    if (snapshot === this.lastPersistedSnapshot) {
      return;
    }

    this.lastPersistedSnapshot = snapshot;
    this.persistState();
  }

  ngOnDestroy(): void {
    this.stopQrScanner();
    this.stopCamera();
    this.clearPhotoPreviews();
  }

  get currentStepIndex(): number {
    return this.steps.findIndex((item) => item.key === this.currentStep);
  }

  get progressPercentage(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  get responsavelTecnicoNome(): string {
    return this.authService.session?.nome?.trim() || 'Usuario autenticado';
  }

  get responsavelTecnicoCargo(): string {
    const labels = this.authService.permissionLabels;
    return labels.length > 0 ? labels.join(', ') : 'Usuário';
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get canGoNext(): boolean {
    return this.currentStepIndex < this.steps.length - 1;
  }

  get canSubmit(): boolean {
    return this.isStepValid('equipamento')
      && this.isStepValid('avaliacao')
      && this.isStepValid('viabilidade')
      && this.isStepValid('recomendacao')
      && this.isStepValid('fotos')
      && this.isStepValid('conclusao');
  }

  get canShowOutroTipo(): boolean {
    return this.form.tipoEquipamento === 'Outro';
  }

  get canShowComputerConfiguration(): boolean {
    return this.form.tipoEquipamento === 'Computador' || this.form.tipoEquipamento === 'Notebook';
  }

  onEquipmentTypeChange(): void {
    if (!this.canShowComputerConfiguration) {
      this.form.processador = '';
      this.form.memoria = '';
      this.form.armazenamento = '';
      this.form.sistemaOperacional = '';
    }
  }

  async openQrReader(): Promise<void> {
    if (this.qrScannerOpen || this.qrScannerStarting) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      this.qrScannerError = 'A leitura ao vivo exige HTTPS. Selecione uma foto da etiqueta para continuar.';
      this.qrInput?.nativeElement.click();
      return;
    }

    this.qrScannerStarting = true;
    this.qrScannerError = '';
    this.patrimonioMessage = '';
    try {
      this.qrScannerDetector = await this.createQrDetector();
      this.qrScannerCanvas = document.createElement('canvas');
      this.qrScannerStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      this.qrScannerOpen = true;
      setTimeout(() => {
        const video = this.qrVideo?.nativeElement;
        if (!video || !this.qrScannerStream) {
          return;
        }
        video.srcObject = this.qrScannerStream;
        video.setAttribute('playsinline', 'true');
        video.play()
          .then(() => this.scanQrVideoFrame())
          .catch(() => {
            this.qrScannerError = 'Não foi possível iniciar a câmera.';
            this.closeQrScanner();
          });
      });
    } catch {
      this.qrScannerError = 'Não foi possível acessar a câmera. Verifique a permissão do navegador.';
    } finally {
      this.qrScannerStarting = false;
    }
  }

  closeQrScanner(): void {
    this.stopQrScanner();
    this.qrScannerOpen = false;
  }

  async onQrImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readingQrCode = true;
    this.patrimonioMessage = '';
    try {
      const rawValue = await this.detectQrCode(file);
      if (!rawValue) {
        this.patrimonioMessage = 'Não foi possível ler o QR Code. Informe o tombamento manualmente.';
        return;
      }

      this.form.patrimonio = this.formatTombamento(rawValue);
      this.consultPatrimonio();
    } catch {
      this.patrimonioMessage = 'Não foi possível processar a imagem do QR Code.';
    } finally {
      this.readingQrCode = false;
      input.value = '';
    }
  }

  onPatrimonioChange(value: string): void {
    this.form.patrimonio = this.formatTombamento(value);
    this.patrimonioMessage = '';

    const tombamento = this.normalizeTombamento(this.form.patrimonio);
    if (tombamento.length < 9) {
      this.lastConsultedPatrimonio = '';
    }

    if (tombamento.length === 9 && tombamento !== this.lastConsultedPatrimonio) {
      this.consultPatrimonio();
    }
  }

  consultPatrimonio(): void {
    const tombamento = this.normalizeTombamento(this.form.patrimonio);
    if (tombamento.length !== 9) {
      return;
    }

    if (this.consultingPatrimonio || tombamento === this.lastConsultedPatrimonio) {
      return;
    }

    this.lastConsultedPatrimonio = tombamento;
    this.consultingPatrimonio = true;
    this.itemInventariadoService.consultarResumoPublico(tombamento)
      .pipe(finalize(() => this.consultingPatrimonio = false))
      .subscribe({
        next: (resumo) => {
          this.form.patrimonio = this.formatTombamento(resumo.tombamento || tombamento);
          this.form.tombamentoAntigo = resumo.tombamentoAntigo || this.form.tombamentoAntigo;
          this.applyPublicDescription(resumo.descricao);
          this.patrimonioMessage = 'Dados do patrimônio localizados e preenchidos automaticamente.';
        },
        error: () => {
          this.lastConsultedPatrimonio = '';
          this.patrimonioMessage = 'Patrimônio lido, mas não foi possível localizar seus dados. Continue o preenchimento manualmente.';
        },
      });
  }

  async openPhotoCamera(): Promise<void> {
    if (!this.selectedPhotoCategory) {
      this.toastr.warning('Escolha o tipo de registro antes de tirar a foto.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      this.photoInput?.nativeElement.click();
      return;
    }

    this.cameraStarting = true;
    this.cameraError = '';
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      this.cameraOpen = true;
      setTimeout(() => {
        const video = this.photoVideo?.nativeElement;
        if (!video || !this.cameraStream) {
          return;
        }
        video.srcObject = this.cameraStream;
        video.setAttribute('playsinline', 'true');
        video.play().catch(() => {
          this.cameraError = 'Não foi possível iniciar a câmera.';
          this.closePhotoCamera();
        });
      });
    } catch {
      this.cameraError = 'Não foi possível acessar a câmera. Verifique a permissão do navegador.';
      this.photoInput?.nativeElement.click();
    } finally {
      this.cameraStarting = false;
    }
  }

  closePhotoCamera(): void {
    this.stopCamera();
    this.cameraOpen = false;
  }

  captureCameraPhoto(): void {
    const video = this.photoVideo?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !this.selectedPhotoCategory) {
      return;
    }

    this.cameraCapturing = true;
    try {
      const maxDimension = 1920;
      const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Falha ao preparar a foto.');
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        this.cameraCapturing = false;
        if (!blob) {
          this.toastr.warning('Não foi possível capturar a foto.');
          return;
        }
        const file = new File([blob], `laudo-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
        this.addPhoto(file);
      }, 'image/jpeg', 0.9);
    } catch {
      this.cameraCapturing = false;
      this.toastr.warning('Não foi possível capturar a foto.');
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedPhotoCategory) {
      return;
    }

    this.addPhoto(file);
    input.value = '';
  }

  removePhoto(index: number): void {
    const [removed] = this.photos.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }
  }

  get canShowOutroProblema(): boolean {
    return this.form.problemasIdentificados.includes('Outro');
  }

  get canShowSugestaoDestinacao(): boolean {
    return this.form.recomendacoes.includes('Encaminhar para desfazimento');
  }

  setStep(step: LaudoStep): void {
    this.currentStep = step;
  }

  goToPreviousStep(): void {
    if (!this.canGoBack) {
      return;
    }

    this.currentStep = this.steps[this.currentStepIndex - 1].key;
  }

  goToNextStep(): void {
    if (!this.canGoNext) {
      return;
    }

    if (!this.isStepValid(this.currentStep)) {
      this.toastr.warning(this.getStepValidationMessage(this.currentStep));
      return;
    }

    this.currentStep = this.steps[this.currentStepIndex + 1].key;
  }

  isStepActive(step: LaudoStep): boolean {
    return this.currentStep === step;
  }

  isOptionSelected(values: string[], option: string): boolean {
    return values.includes(option);
  }

  toggleMultiSelect(field: 'problemasIdentificados' | 'recomendacoes' | 'sugestoesDestinacao' | 'registroFotografico', option: string, checked: boolean): void {
    const current = [...this.form[field]];
    const next = checked
      ? [...current, option]
      : current.filter((item) => item !== option);

    this.form = {
      ...this.form,
      [field]: next,
    };

    if (field === 'problemasIdentificados' && !next.includes('Outro')) {
      this.form.outroProblema = '';
    }

    if (field === 'recomendacoes' && !next.includes('Encaminhar para desfazimento')) {
      this.form.sugestoesDestinacao = [];
    }
  }

  submit(): void {
    if (!this.canSubmit) {
      this.toastr.warning('Revise os campos obrigatorios antes de salvar o laudo.');
      return;
    }

    this.saving = true;
    this.laudoTecnicoService.create(this.buildPayload()).pipe(
      switchMap((laudo) => this.laudoTecnicoService.addFotos(
        laudo.id,
        this.photos.map((foto) => ({ categoria: foto.categoria, file: foto.file }))
      ))
    ).subscribe({
      next: (laudo) => {
        this.saving = false;
        this.savedLaudo = laudo;
        this.toastr.success('Laudo tecnico salvo com sucesso.');
        this.closeQrScanner();
        this.closePhotoCamera();
        this.form = this.createEmptyForm();
        this.clearPhotoPreviews();
        this.photos = [];
        this.selectedPhotoCategory = '';
        this.currentStep = 'equipamento';
        this.syncSnapshotWithoutPersist();
        this.clearStateStorage();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel salvar o laudo tecnico.');
      },
    });
  }

  resetDraft(): void {
    this.savedLaudo = null;
    this.closeQrScanner();
    this.closePhotoCamera();
    this.form = this.createEmptyForm();
    this.clearPhotoPreviews();
    this.photos = [];
    this.selectedPhotoCategory = '';
    this.currentStep = 'equipamento';
    this.syncSnapshotWithoutPersist();
    this.clearStateStorage();
  }

  private buildPayload(): LaudoTecnicoPayload {
    return {
      processoSei: this.form.processoSei.trim(),
      idDevolucaoSei: this.form.idDevolucaoSei.trim(),
      unidadeGestora: this.form.unidadeGestora.trim(),
      setor: this.form.setor.trim(),
      dataAvaliacao: this.form.dataAvaliacao || null,
      tipoEquipamento: this.form.tipoEquipamento,
      outroTipoEquipamento: this.form.outroTipoEquipamento.trim(),
      patrimonio: this.form.patrimonio.trim(),
      tombamentoAntigo: this.form.tombamentoAntigo.trim(),
      numeroSerie: this.form.numeroSerie.trim(),
      marca: this.form.marca.trim(),
      modelo: this.form.modelo.trim(),
      anoAquisicao: this.form.anoAquisicao.trim(),
      processador: this.form.processador.trim(),
      memoria: this.form.memoria.trim(),
      armazenamento: this.form.armazenamento.trim(),
      sistemaOperacional: this.form.sistemaOperacional.trim(),
      outros: this.form.outros.trim(),
      condicaoFuncionamento: this.form.condicaoFuncionamento,
      descricaoFuncionamento: this.form.descricaoFuncionamento.trim(),
      estadoConservacao: this.form.estadoConservacao,
      problemasIdentificados: this.form.problemasIdentificados,
      outroProblema: this.form.outroProblema.trim(),
      descricaoTecnicaDetalhada: this.form.descricaoTecnicaDetalhada.trim(),
      possuiReparo: this.form.possuiReparo === '' ? null : this.form.possuiReparo === 'SIM',
      descricaoReparo: this.form.descricaoReparo.trim(),
      valorEstimadoMercado: this.parseOptionalNumber(this.form.valorEstimadoMercado),
      custoEstimadoManutencao: this.parseOptionalNumber(this.form.custoEstimadoManutencao),
      percentualEstimado: this.parseOptionalNumber(this.form.percentualEstimado),
      classificacaoTecnica: this.form.classificacaoTecnica,
      justificativaTecnica: this.form.justificativaTecnica.trim(),
      recomendacoes: this.form.recomendacoes,
      sugestoesDestinacao: this.form.sugestoesDestinacao,
      registroFotografico: [...new Set(this.photos.map((foto) => foto.categoria))],
      quantidadeFotos: this.photos.length,
      conclusaoCondicao: this.form.conclusaoCondicao,
      classificacaoFinal: this.form.classificacaoFinal.trim(),
    };
  }

  private parseOptionalNumber(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const normalized = Number(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }

  private parseOptionalInteger(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const normalized = Number.parseInt(value, 10);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private isStepValid(step: LaudoStep): boolean {
    switch (step) {
      case 'equipamento':
        return !!this.form.tipoEquipamento
          && (!this.canShowOutroTipo || !!this.form.outroTipoEquipamento.trim())
          && !!(
            this.form.patrimonio.trim()
            || this.form.numeroSerie.trim()
            || this.form.marca.trim()
            || this.form.modelo.trim()
          );
      case 'avaliacao':
        return !!this.form.condicaoFuncionamento
          && !!this.form.estadoConservacao
          && !!this.form.descricaoTecnicaDetalhada.trim();
      case 'viabilidade':
        return this.form.possuiReparo !== '';
      case 'recomendacao':
        return !!this.form.classificacaoTecnica && !!this.form.justificativaTecnica.trim();
      case 'fotos':
        return this.photos.length > 0;
      case 'conclusao':
        return !!this.form.conclusaoCondicao;
      default:
        return false;
    }
  }

  private getStepValidationMessage(step: LaudoStep): string {
    switch (step) {
      case 'equipamento':
        return 'Selecione o tipo do equipamento e preencha algum identificador do bem.';
      case 'avaliacao':
        return 'Preencha a avaliacao tecnica principal antes de avancar.';
      case 'viabilidade':
        return 'Indique se existe possibilidade de reparo.';
      case 'recomendacao':
        return 'Defina a classificacao tecnica e a justificativa do laudo.';
      case 'fotos':
        return 'Registre pelo menos uma foto para continuar.';
      case 'conclusao':
        return 'Selecione a conclusao do laudo.';
      default:
        return 'Revise os campos obrigatorios.';
    }
  }

  private createEmptyForm(): LaudoForm {
    return {
      processoSei: '',
      idDevolucaoSei: '',
      unidadeGestora: '',
      setor: '',
      dataAvaliacao: '',
      tipoEquipamento: '',
      outroTipoEquipamento: '',
      patrimonio: '',
      tombamentoAntigo: '',
      numeroSerie: '',
      marca: '',
      modelo: '',
      anoAquisicao: '',
      processador: '',
      memoria: '',
      armazenamento: '',
      sistemaOperacional: '',
      outros: '',
      condicaoFuncionamento: '',
      descricaoFuncionamento: '',
      estadoConservacao: '',
      problemasIdentificados: [],
      outroProblema: '',
      descricaoTecnicaDetalhada: '',
      possuiReparo: '',
      descricaoReparo: '',
      valorEstimadoMercado: '',
      custoEstimadoManutencao: '',
      percentualEstimado: '',
      classificacaoTecnica: '',
      justificativaTecnica: '',
      recomendacoes: [],
      sugestoesDestinacao: [],
      registroFotografico: [],
      quantidadeFotos: '',
      conclusaoCondicao: '',
      classificacaoFinal: '',
    };
  }

  private persistState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const state: PersistedLaudoState = {
      currentStep: this.currentStep,
      form: this.form,
    };

    window.sessionStorage.setItem(LaudoTecnicoComponent.STORAGE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    if (typeof window === 'undefined') {
      this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
      return;
    }

    const raw = window.sessionStorage.getItem(LaudoTecnicoComponent.STORAGE_KEY);
    if (!raw) {
      this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
      return;
    }

    try {
      const state = JSON.parse(raw) as PersistedLaudoState;
      this.currentStep = this.steps.some((step) => step.key === state.currentStep)
        ? state.currentStep
        : 'equipamento';
      this.form = {
        ...this.createEmptyForm(),
        ...state.form,
        problemasIdentificados: state.form?.problemasIdentificados ?? [],
        recomendacoes: state.form?.recomendacoes ?? [],
        sugestoesDestinacao: state.form?.sugestoesDestinacao ?? [],
        registroFotografico: state.form?.registroFotografico ?? [],
      };
    } catch {
      this.clearStateStorage();
    }

    this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
  }

  private clearStateStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(LaudoTecnicoComponent.STORAGE_KEY);
  }

  private syncSnapshotWithoutPersist(): void {
    this.lastPersistedSnapshot = JSON.stringify({
      currentStep: this.currentStep,
      form: this.form,
    });
  }

  private async detectQrCode(file: File): Promise<string | null> {
    const image = await this.loadImage(file);
    const scale = Math.min(1, LaudoTecnicoComponent.QR_IMAGE_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' })?.data?.trim() ?? null;
  }

  private async createQrDetector(): Promise<{ detect(source: ImageBitmap): Promise<Array<{ rawValue?: string }>> } | null> {
    if (!window.BarcodeDetector) {
      return null;
    }

    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
      if (!supportedFormats.includes('qr_code')) {
        return null;
      }
    }

    return new window.BarcodeDetector({ formats: ['qr_code'] });
  }

  private scanQrVideoFrame(): void {
    if (!this.qrScannerOpen) {
      return;
    }

    const video = this.qrVideo?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.qrScannerFrameId = window.requestAnimationFrame(() => this.scanQrVideoFrame());
      return;
    }

    this.detectQrFromVideo(video)
      .then((rawValue) => {
        if (rawValue) {
          this.form.patrimonio = this.formatTombamento(rawValue);
          this.patrimonioMessage = 'QR Code identificado automaticamente pela câmera.';
          this.closeQrScanner();
          this.consultPatrimonio();
          return;
        }
        if (this.qrScannerOpen) {
          this.qrScannerFrameId = window.requestAnimationFrame(() => this.scanQrVideoFrame());
        }
      })
      .catch(() => {
        if (this.qrScannerOpen) {
          this.qrScannerFrameId = window.requestAnimationFrame(() => this.scanQrVideoFrame());
        }
      });
  }

  private async detectQrFromVideo(video: HTMLVideoElement): Promise<string | null> {
    const crop = this.getQrScannerCrop(video);
    if (this.qrScannerDetector) {
      const bitmap = await createImageBitmap(video, crop.x, crop.y, crop.width, crop.height);
      try {
        const results = await this.qrScannerDetector.detect(bitmap);
        const rawValue = results.find((item) => !!item.rawValue)?.rawValue?.trim();
        if (rawValue) {
          return rawValue;
        }
      } finally {
        bitmap.close();
      }
    }

    const canvas = this.qrScannerCanvas ?? document.createElement('canvas');
    this.qrScannerCanvas = canvas;
    const scale = Math.min(1, LaudoTecnicoComponent.QR_SCAN_MAX_DIMENSION / Math.max(crop.width, crop.height));
    canvas.width = Math.max(1, Math.round(crop.width * scale));
    canvas.height = Math.max(1, Math.round(crop.height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }
    context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })?.data?.trim() ?? null;
  }

  private getQrScannerCrop(video: HTMLVideoElement): { x: number; y: number; width: number; height: number } {
    const width = Math.round(video.videoWidth * LaudoTecnicoComponent.QR_SCAN_CROP_WIDTH_RATIO);
    const height = Math.round(video.videoHeight * LaudoTecnicoComponent.QR_SCAN_CROP_HEIGHT_RATIO);
    return {
      x: Math.max(0, Math.round((video.videoWidth - width) / 2)),
      y: Math.max(0, Math.round((video.videoHeight - height) / 2)),
      width,
      height,
    };
  }

  private stopQrScanner(): void {
    if (this.qrScannerFrameId !== null) {
      window.cancelAnimationFrame(this.qrScannerFrameId);
      this.qrScannerFrameId = null;
    }
    const video = this.qrVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.qrScannerStream?.getTracks().forEach((track) => track.stop());
    this.qrScannerStream = null;
    this.qrScannerCanvas = null;
    this.qrScannerDetector = null;
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Falha ao carregar imagem.'));
      };
      image.src = objectUrl;
    });
  }

  private normalizeTombamento(value: string): string {
    const trimmed = value.trim();
    try {
      const url = new URL(trimmed);
      return (url.pathname.split('/').filter(Boolean).at(-1) ?? '').replace(/\D/g, '');
    } catch {
      return trimmed.replace(/\D/g, '');
    }
  }

  private formatTombamento(value: string): string {
    const digits = this.normalizeTombamento(value).slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  private applyPublicDescription(description: string): void {
    if (!description) {
      return;
    }

    const marca = description.match(/marca\s*[:\-]?\s*([^,;\-]+?)(?=\s+modelo\b|[,;\-]|$)/i)?.[1]?.trim();
    const modelo = description.match(/modelo\s*[:\-]?\s*([^,;\-]+)/i)?.[1]?.trim();
    this.form.marca = marca || this.form.marca;
    this.form.modelo = modelo || this.form.modelo;
    this.form.outros = this.form.outros || description;
  }

  private clearPhotoPreviews(): void {
    this.photos.forEach((foto) => URL.revokeObjectURL(foto.previewUrl));
  }

  private addPhoto(file: File): void {
    this.photos.push({ categoria: this.selectedPhotoCategory, file, previewUrl: URL.createObjectURL(file) });
  }

  private stopCamera(): void {
    const video = this.photoVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
  }
}
