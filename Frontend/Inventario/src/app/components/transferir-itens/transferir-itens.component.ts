import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import jsQR from 'jsqr';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ConsultaPublicaBem } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { UnidadeAdministrativa } from '../../contracts/unidade-administrativa.model';
import { UnidadeAdministrativaService } from '../../contracts/unidade-administrativa.service';
import { Transferencia, TransferenciaItem, TransferenciaPayload } from '../../contracts/transferencia.model';
import { TransferenciaService } from '../../contracts/transferencia.service';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect(source: ImageBitmap): Promise<Array<{ rawValue?: string }>>;
      };
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

interface TransferenciaForm {
  unidadeAdministrativaDestinoId: string | null;
  responsavelDestino: string;
  idSeiTermo: string;
  dataEntrega: string;
  status: string;
  observacao: string;
}

interface DraftItem {
  tombamento: string;
  tombamentoAntigo: string;
  descricao: string;
  observacao: string;
  condicao: string;
  statusItem: string;
}

interface UnidadeDestinoOption extends SearchableSelectOption {
  value: string;
}

type TransferenciaStep = 'dados' | 'itens' | 'resumo';

@Component({
  selector: 'app-transferir-itens',
  templateUrl: './transferir-itens.component.html',
  styleUrl: './transferir-itens.component.scss',
})
export class TransferirItensComponent implements OnInit, OnDestroy {
  private static readonly QR_IMAGE_MAX_DIMENSION = 1600;

  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('identificationInput') identificationInput?: ElementRef<HTMLInputElement>;

  transferenciaId: string | null = null;
  currentStep: TransferenciaStep = 'dados';
  loading = false;
  saving = false;
  scannerOpen = false;
  scannerStarting = false;
  readingCode = false;
  scannerMessage = '';
  codeReadMessage = '';
  consultaEmAndamento = false;
  manualLookupMessage = '';
  unidadesAdministrativas: UnidadeAdministrativa[] = [];
  manualItem: DraftItem = this.createEmptyDraftItem();
  form: TransferenciaForm = this.createEmptyForm();
  itens: TransferenciaItem[] = [];
  itemPendente: TransferenciaItem | null = null;
  manualModalOpen = false;

  private scannerStream: MediaStream | null = null;
  private scannerFrameId: number | null = null;
  private scannerDetector: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null;
  private scannerCanvas: HTMLCanvasElement | null = null;

  constructor(
    readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly unidadeAdministrativaService: UnidadeAdministrativaService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly transferenciaService: TransferenciaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.transferenciaId = this.route.snapshot.paramMap.get('id');
    this.loadUnidadesAdministrativas();
    if (this.transferenciaId) {
      this.loadTransferencia(this.transferenciaId);
    }
  }

  ngOnDestroy(): void {
    this.closeScanner();
  }

  get canUseLiveScanner(): boolean {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && !!navigator.mediaDevices?.getUserMedia;
  }

  get unidadeSelecionada(): UnidadeAdministrativa | null {
    return this.unidadesAdministrativas.find((item) => item.id === this.form.unidadeAdministrativaDestinoId) ?? null;
  }

  get unidadeDestinoOptions(): UnidadeDestinoOption[] {
    return this.buildUnidadeDestinoOptions();
  }

  get statusOptions(): string[] {
    return ['RASCUNHO', 'EM SEPARAÇÃO', 'AGUARDANDO CONCLUSÃO', 'CONCLUÍDA', 'CANCELADA'];
  }

  get condicaoOptions(): string[] {
    return ['SERVÍVEL', 'INSERVÍVEL', 'OBSOLETO', 'DEFEITO'];
  }

  get canSave(): boolean {
    return !!this.form.unidadeAdministrativaDestinoId && !!this.form.responsavelDestino.trim() && this.itens.length > 0;
  }

  get canAdvanceToItens(): boolean {
    return !!this.form.unidadeAdministrativaDestinoId;
  }

  loadUnidadesAdministrativas(): void {
    this.unidadeAdministrativaService.getAll().subscribe({
      next: (data) => {
        this.unidadesAdministrativas = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
      },
      error: () => {
        this.toastr.error('Não foi possível carregar as unidades administrativas de destino.');
      },
    });
  }

  loadTransferencia(id: string): void {
    this.loading = true;
    this.transferenciaService.getById(id).subscribe({
      next: (transferencia) => {
        this.loading = false;
        this.applyTransferencia(transferencia);
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar a transferência.');
      },
    });
  }

  startQrFlow(): void {
    if (this.scannerStarting || this.readingCode) {
      return;
    }

    if (this.canUseLiveScanner) {
      void this.openScanner();
      return;
    }

    this.identificationInput?.nativeElement.click();
  }

  async onIdentificationPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readingCode = true;
    this.codeReadMessage = '';

    try {
      const rawValue = await this.detectCodeFromImageFile(file);
      if (!rawValue) {
        this.toastr.warning('Não foi possível ler o QR code da imagem.');
        return;
      }

      this.playScanBeep();
      this.handleDetectedCode(rawValue);
    } catch {
      this.toastr.error('Falha ao processar a imagem do QR code.');
    } finally {
      input.value = '';
      this.readingCode = false;
    }
  }

  async openScanner(): Promise<void> {
    if (this.scannerStarting || this.scannerOpen) {
      return;
    }

    this.scannerStarting = true;
    this.scannerMessage = '';

    try {
      this.scannerDetector = await this.createDetector();
      this.scannerCanvas = document.createElement('canvas');
      this.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      this.scannerOpen = true;

      setTimeout(() => {
        const video = this.scannerVideo?.nativeElement;
        if (!video || !this.scannerStream) {
          return;
        }

        video.srcObject = this.scannerStream;
        video.setAttribute('playsinline', 'true');
        video.play()
          .then(() => this.scanVideoFrame())
          .catch(() => {
            this.scannerMessage = 'Não foi possível iniciar a câmera.';
            this.closeScanner();
          });
      });
    } catch {
      this.scannerMessage = 'Não foi possível acessar a câmera do dispositivo.';
    } finally {
      this.scannerStarting = false;
    }
  }

  closeScanner(): void {
    if (this.scannerFrameId !== null) {
      window.cancelAnimationFrame(this.scannerFrameId);
      this.scannerFrameId = null;
    }

    const video = this.scannerVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (this.scannerStream) {
      this.scannerStream.getTracks().forEach((track) => track.stop());
      this.scannerStream = null;
    }

    this.scannerOpen = false;
    this.scannerCanvas = null;
  }

  addManualItem(): void {
    if (!this.manualItem.descricao.trim()) {
      this.toastr.warning('Informe a descrição do item para adicionar manualmente.');
      return;
    }

    this.itemPendente = {
      id: crypto.randomUUID(),
      tombamentoNovo: this.formatTombamentoValue(this.manualItem.tombamento),
      tombamentoAntigo: this.manualItem.tombamentoAntigo.trim(),
      descricao: this.manualItem.descricao.trim(),
      statusItem: this.manualItem.statusItem || 'CEDIDO',
      condicao: this.manualItem.condicao || 'SERVÍVEL',
      observacao: this.manualItem.observacao.trim(),
    };
    this.manualModalOpen = false;
  }

  removeItem(index: number): void {
    this.itens.splice(index, 1);
  }

  resetTransferencia(): void {
    this.form = this.createEmptyForm();
    this.manualItem = this.createEmptyDraftItem();
    this.itemPendente = null;
    this.itens = [];
    this.codeReadMessage = '';
    this.scannerMessage = '';
    this.currentStep = 'dados';
    this.closeScanner();
  }

  goToDadosStep(): void {
    this.currentStep = 'dados';
  }

  goToItensStep(): void {
    if (!this.canAdvanceToItens) {
      this.toastr.warning('Selecione a unidade administrativa de destino para continuar.');
      return;
    }

    this.currentStep = 'itens';
  }

  goToResumoStep(): void {
    if (this.itens.length === 0) {
      this.toastr.warning('Adicione ao menos um item antes de continuar.');
      return;
    }

    this.currentStep = 'resumo';
  }

  openManualModal(): void {
    this.manualItem = this.createEmptyDraftItem();
    this.itemPendente = null;
    this.manualModalOpen = true;
  }

  closeManualModal(): void {
    this.manualModalOpen = false;
    this.manualItem = this.createEmptyDraftItem();
    this.manualLookupMessage = '';
  }

  confirmarAdicionarItemPendente(): void {
    if (!this.itemPendente) {
      return;
    }

    if (this.itens.some((item) => item.tombamentoNovo && item.tombamentoNovo === this.itemPendente?.tombamentoNovo && item.descricao === this.itemPendente?.descricao)) {
      this.toastr.info('Esse item já foi adicionado à transferência.');
      this.itemPendente = null;
      return;
    }

    this.itens.push(this.itemPendente);
    this.itemPendente = null;
    this.manualItem = this.createEmptyDraftItem();
    this.codeReadMessage = 'Item adicionado à transferência.';
  }

  cancelarItemPendente(): void {
    this.itemPendente = null;
  }

  onTombamentoAntigoChange(item: TransferenciaItem, value: string): void {
    item.tombamentoAntigo = this.normalizeTombamentoAntigoValue(value);
  }

  onManualTombamentoBlur(): void {
    const tombamento = this.formatTombamentoValue(this.manualItem.tombamento);
    const digits = tombamento.replace(/\D/g, '');
    this.manualItem.tombamento = tombamento;
    this.manualLookupMessage = '';

    if (digits.length !== 9 || this.consultaEmAndamento) {
      return;
    }

    if (this.itens.some((item) => item.tombamentoNovo === tombamento)) {
      this.toastr.info('Esse tombamento já foi adicionado à transferência.');
      return;
    }

    this.consultaEmAndamento = true;
    this.manualLookupMessage = 'Consultando dados do item...';
    this.itemInventariadoService.consultarResumoPublico(digits)
      .pipe(finalize(() => {
        this.consultaEmAndamento = false;
      }))
      .subscribe({
        next: (resumo) => {
          this.manualItem.tombamento = this.formatTombamentoValue(resumo.tombamento || tombamento);
          this.manualItem.tombamentoAntigo = this.normalizeTombamentoAntigoValue(resumo.tombamentoAntigo);
          this.manualItem.descricao = resumo.descricao || resumo.tipo || this.manualItem.descricao;
          this.manualLookupMessage = 'Dados do item carregados.';
        },
        error: (error) => {
          this.manualLookupMessage = '';
          if (error?.status === 404) {
            this.toastr.info('Tombamento não localizado no e-Estado. Preencha os dados manualmente.');
            return;
          }

          this.toastr.error('Não foi possível consultar o tombamento informado.');
        },
      });
  }

  save(status?: string): void {
    if (!this.canSave) {
      this.toastr.warning('Selecione a unidade administrativa, o responsável e adicione ao menos um item.');
      return;
    }

    const payload = this.toPayload(status);
    this.saving = true;

    const request = this.transferenciaId
      ? this.transferenciaService.update(this.transferenciaId, payload)
      : this.transferenciaService.create(payload);

    request.subscribe({
      next: (transferencia) => {
        this.saving = false;
        this.transferenciaId = transferencia.id;
        this.applyTransferencia(transferencia);
        this.currentStep = 'resumo';
        this.toastr.success('Transferência salva com sucesso.');
        this.router.navigate(['/transferencias', transferencia.id]);
      },
      error: (error) => {
        this.saving = false;
        const message = error?.error?.message ?? 'Não foi possível salvar a transferência.';
        this.toastr.error(message);
      },
    });
  }

  private handleDetectedCode(rawValue: string): void {
    const tombamento = this.formatTombamentoValue(rawValue);
    if (!tombamento) {
      this.toastr.warning('Não foi possível identificar um tombamento válido.');
      return;
    }

    if (this.itens.some((item) => item.tombamentoNovo === tombamento)) {
      this.toastr.info('Esse tombamento já foi adicionado à transferência.');
      this.manualItem = this.createEmptyDraftItem();
      this.itemPendente = null;
      this.closeScanner();
      return;
    }

    this.consultaEmAndamento = true;
    this.itemInventariadoService.consultarResumoPublico(tombamento.replace(/\D/g, ''))
      .pipe(finalize(() => {
        this.consultaEmAndamento = false;
        this.readingCode = false;
      }))
      .subscribe({
        next: (resumo) => {
          this.itemPendente = this.mapResumoToItem(resumo, tombamento);
          this.codeReadMessage = 'Resumo do item carregado. Confirme para adicionar.';
          this.manualItem = this.createEmptyDraftItem();
          this.closeScanner();
        },
        error: (error) => {
          if (error?.status === 404) {
            this.itemPendente = {
              id: crypto.randomUUID(),
              tombamentoNovo: tombamento,
              tombamentoAntigo: '',
              descricao: `Item ${tombamento}`,
              statusItem: 'CEDIDO',
              condicao: this.manualItem.condicao || 'SERVÍVEL',
              observacao: this.manualItem.observacao.trim(),
            };
            this.codeReadMessage = 'Resumo público não localizado. Confirme para adicionar manualmente.';
            this.manualItem = this.createEmptyDraftItem();
            this.closeScanner();
            return;
          }

          this.toastr.error('Não foi possível consultar o tombamento informado.');
        },
      });
  }

  private applyTransferencia(transferencia: Transferencia): void {
    this.form = {
      unidadeAdministrativaDestinoId: transferencia.unidadeAdministrativaDestinoId,
      responsavelDestino: transferencia.responsavelDestino,
      idSeiTermo: transferencia.idSeiTermo,
      dataEntrega: transferencia.dataEntrega ? transferencia.dataEntrega.slice(0, 10) : '',
      status: transferencia.status,
      observacao: transferencia.observacao,
    };
    this.itens = transferencia.itens.map((item) => ({ ...item }));
    this.currentStep = this.itens.length > 0 ? 'resumo' : 'dados';
  }

  private toPayload(nextStatus?: string): TransferenciaPayload {
    return {
      unidadeAdministrativaDestinoId: this.form.unidadeAdministrativaDestinoId ?? '',
      responsavelDestino: this.form.responsavelDestino.trim(),
      idSeiTermo: this.form.idSeiTermo.trim(),
      dataEntrega: this.form.dataEntrega || null,
      status: nextStatus ?? this.form.status,
      observacao: this.form.observacao.trim(),
      itens: this.itens.map((item) => ({
        tombamentoNovo: item.tombamentoNovo,
        tombamentoAntigo: this.normalizeTombamentoAntigoValue(item.tombamentoAntigo),
        descricao: item.descricao,
        statusItem: item.statusItem,
        condicao: item.condicao,
        observacao: item.observacao,
      })),
    };
  }

  private mapResumoToItem(resumo: ConsultaPublicaBem, tombamento: string): TransferenciaItem {
    return {
      id: crypto.randomUUID(),
      tombamentoNovo: this.formatTombamentoValue(resumo.tombamento || tombamento),
      tombamentoAntigo: this.normalizeTombamentoAntigoValue(resumo.tombamentoAntigo),
      descricao: resumo.descricao || resumo.tipo || `Item ${tombamento}`,
      statusItem: this.manualItem.statusItem || 'CEDIDO',
      condicao: this.manualItem.condicao || 'SERVÍVEL',
      observacao: this.manualItem.observacao.trim(),
    };
  }

  private createEmptyForm(): TransferenciaForm {
    return {
      unidadeAdministrativaDestinoId: null,
      responsavelDestino: '',
      idSeiTermo: '',
      dataEntrega: '',
      status: 'RASCUNHO',
      observacao: '',
    };
  }

  private createEmptyDraftItem(): DraftItem {
    return {
      tombamento: '',
      tombamentoAntigo: '',
      descricao: '',
      observacao: '',
      condicao: 'SERVÍVEL',
      statusItem: 'CEDIDO',
    };
  }

  private buildUnidadeDestinoOptions(): UnidadeDestinoOption[] {
    const childrenByParent = new Map<string | null, UnidadeAdministrativa[]>();

    for (const unidade of this.unidadesAdministrativas) {
      const parentId = unidade.unidadeSuperiorId ?? null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(unidade);
      childrenByParent.set(parentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    const options: UnidadeDestinoOption[] = [];

    const walk = (parentId: string | null, depth: number): void => {
      for (const unidade of childrenByParent.get(parentId) ?? []) {
        options.push({
          value: unidade.id,
          label: `${unidade.sigla} - ${unidade.nome}`,
          depth,
        });
        walk(unidade.id, depth + 1);
      }
    };

    walk(null, 0);

    return options;
  }

  normalizeTombamentoAntigoValue(value: string | null | undefined): string {
    return (value ?? '').replace(/\./g, '').trim();
  }

  private normalizeScannedValue(value: string): string {
    const trimmed = value.trim();

    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      const lastSegment = segments.at(-1) ?? trimmed;
      const digitsFromSegment = lastSegment.replace(/\D/g, '');
      if (digitsFromSegment) {
        return digitsFromSegment;
      }
    } catch {
      // Continue with generic normalization.
    }

    const digits = trimmed.replace(/\D/g, '');
    return digits || trimmed;
  }

  private formatTombamentoValue(value: string): string {
    const digits = this.normalizeScannedValue(value).replace(/\D/g, '').slice(0, 9);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  private async createDetector(): Promise<InstanceType<NonNullable<typeof window.BarcodeDetector>> | null> {
    if (!window.BarcodeDetector) {
      return null;
    }

    const formats = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e'];
    if (typeof window.BarcodeDetector.getSupportedFormats !== 'function') {
      return new window.BarcodeDetector({ formats });
    }

    const supportedFormats = await window.BarcodeDetector.getSupportedFormats();
    const availableFormats = formats.filter((item) => supportedFormats.includes(item));
    return new window.BarcodeDetector({ formats: availableFormats.length > 0 ? availableFormats : formats });
  }

  private scanVideoFrame(): void {
    if (!this.scannerOpen) {
      return;
    }

    const video = this.scannerVideo?.nativeElement;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scannerFrameId = window.requestAnimationFrame(() => this.scanVideoFrame());
      return;
    }

    this.detectCodeFromVideoFrame(video)
      .then((rawValue) => {
        if (rawValue) {
          this.playScanBeep();
          this.handleDetectedCode(rawValue);
          return;
        }

        if (this.scannerOpen) {
          this.scannerFrameId = window.requestAnimationFrame(() => this.scanVideoFrame());
        }
      })
      .catch(() => {
        if (this.scannerOpen) {
          this.scannerFrameId = window.requestAnimationFrame(() => this.scanVideoFrame());
        }
      });
  }

  private async detectCodeFromVideoFrame(video: HTMLVideoElement): Promise<string | null> {
    if (this.scannerDetector) {
      const bitmap = await createImageBitmap(video);
      try {
        const results = await this.scannerDetector.detect(bitmap);
        const rawValue = results.find((item) => !!item.rawValue)?.rawValue?.trim();
        if (rawValue) {
          return rawValue;
        }
      } finally {
        bitmap.close();
      }
    }

    const canvas = this.scannerCanvas ?? document.createElement('canvas');
    this.scannerCanvas = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    return result?.data?.trim() ?? null;
  }

  private async detectCodeFromImageFile(file: File): Promise<string | null> {
    const canvas = await this.renderImageToCanvas(file, TransferirItensComponent.QR_IMAGE_MAX_DIMENSION);
    const detector = await this.createDetector();
    if (detector) {
      const bitmap = await createImageBitmap(canvas);
      try {
        const results = await detector.detect(bitmap);
        const rawValue = results.find((item) => !!item.rawValue)?.rawValue?.trim();
        if (rawValue) {
          return rawValue;
        }
      } finally {
        bitmap.close();
      }
    }

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    return result?.data?.trim() ?? null;
  }

  private playScanBeep(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1244.5, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
    oscillator.onended = () => {
      void context.close();
    };
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

  private async renderImageToCanvas(file: File, maxDimension: number): Promise<HTMLCanvasElement> {
    const image = await this.loadImage(file);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Falha ao preparar imagem.');
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
}
