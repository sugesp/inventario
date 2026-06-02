import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ConsultaPublicaBem } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { Levantamento, LevantamentoItem } from '../../contracts/levantamento.model';
import { LevantamentoService } from '../../contracts/levantamento.service';

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

interface LevantamentoForm {
  nome: string;
  descricao: string;
}

interface LevantamentoItemPreview {
  tombamento: string;
  tombamentoAntigo: string;
  descricao: string;
  tipo: string;
  urlConsulta: string;
}

type LevantamentoStep = 'levantamento' | 'leitura' | 'confirmacao';

@Component({
  selector: 'app-levantamentos',
  templateUrl: './levantamentos.component.html',
  styleUrl: './levantamentos.component.scss',
})
export class LevantamentosComponent implements OnInit, OnDestroy {
  private static readonly QR_IMAGE_MAX_DIMENSION = 1600;

  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('identificationInput') identificationInput?: ElementRef<HTMLInputElement>;

  levantamentos: Levantamento[] = [];
  activeLevantamentoId = '';
  currentStep: LevantamentoStep = 'levantamento';
  form: LevantamentoForm = { nome: '', descricao: '' };
  manualTombamento = '';
  manualTombamentoAntigo = '';
  manualDescricao = '';
  loading = false;
  creating = false;
  scannerOpen = false;
  scannerStarting = false;
  readingCode = false;
  consultaEmAndamento = false;
  scannerMessage = '';
  codeReadMessage = '';
  pendingItem: LevantamentoItemPreview | null = null;
  confirmingItem = false;
  usuariosLevantamento: Array<{ id: string; nome: string; cpf: string }> = [];
  sharingModalOpen = false;
  loadingSharingUsers = false;
  savingSharing = false;
  sharingSelection = new Set<string>();

  private scannerStream: MediaStream | null = null;
  private scannerFrameId: number | null = null;
  private scannerDetector: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null;
  private scannerCanvas: HTMLCanvasElement | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly levantamentoService: LevantamentoService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLevantamentos();
  }

  ngOnDestroy(): void {
    this.closeScanner();
  }

  get activeLevantamento(): Levantamento | null {
    return this.levantamentos.find((item) => item.id === this.activeLevantamentoId) ?? null;
  }

  get canUseLiveScanner(): boolean {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && !!navigator.mediaDevices?.getUserMedia;
  }

  get canCreate(): boolean {
    return !!this.form.nome.trim();
  }

  get hasActiveLevantamento(): boolean {
    return !!this.activeLevantamento;
  }

  get isLevantamentoStep(): boolean {
    return this.currentStep === 'levantamento';
  }

  get isLeituraStep(): boolean {
    return this.currentStep === 'leitura';
  }

  get isConfirmacaoStep(): boolean {
    return this.currentStep === 'confirmacao';
  }

  get usuariosCompartilhamentoDisponiveis(): Array<{ id: string; nome: string; cpf: string }> {
    const criadoPorUsuarioId = this.activeLevantamento?.criadoPorUsuarioId;
    return this.usuariosLevantamento.filter((usuario) => usuario.id !== criadoPorUsuarioId);
  }

  loadLevantamentos(selectId?: string): void {
    this.loading = true;
    this.levantamentoService.getAll().subscribe({
      next: (data) => {
        this.loading = false;
        this.levantamentos = data;

        if (selectId && data.some((item) => item.id === selectId)) {
          this.activeLevantamentoId = selectId;
          if (!this.pendingItem) {
            this.currentStep = 'leitura';
          }
          return;
        }

        if (this.activeLevantamentoId && data.some((item) => item.id === this.activeLevantamentoId)) {
          return;
        }

        this.activeLevantamentoId = data[0]?.id ?? '';
        if (this.activeLevantamentoId && !this.pendingItem) {
          this.currentStep = 'leitura';
        }
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar os levantamentos.');
      },
    });
  }

  createLevantamento(): void {
    if (!this.canCreate) {
      this.toastr.warning('Informe o nome do levantamento para continuar.');
      return;
    }

    this.creating = true;
    this.levantamentoService.create({
      nome: this.form.nome.trim(),
      descricao: this.form.descricao.trim(),
    }).subscribe({
      next: (levantamento) => {
        this.creating = false;
        this.form = { nome: '', descricao: '' };
        this.pendingItem = null;
        this.manualTombamento = '';
        this.manualTombamentoAntigo = '';
        this.manualDescricao = '';
        this.levantamentos = [levantamento, ...this.levantamentos];
        this.activeLevantamentoId = levantamento.id;
        this.currentStep = 'leitura';
        this.toastr.success('Levantamento criado com sucesso.');
      },
      error: (error) => {
        this.creating = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível criar o levantamento.');
      },
    });
  }

  selectLevantamento(levantamento: Levantamento): void {
    this.activeLevantamentoId = levantamento.id;
    this.pendingItem = null;
    this.codeReadMessage = '';
    this.manualTombamento = '';
    this.manualTombamentoAntigo = '';
    this.manualDescricao = '';
    this.currentStep = 'leitura';
  }

  openSharingModal(levantamento: Levantamento): void {
    if (!levantamento.usuarioPodeCompartilhar) {
      this.toastr.warning('Somente o criador pode compartilhar este levantamento.');
      return;
    }

    this.activeLevantamentoId = levantamento.id;
    this.sharingSelection = new Set(levantamento.compartilhamentos.map((item) => item.usuarioId));
    this.sharingModalOpen = true;

    if (this.usuariosLevantamento.length === 0) {
      this.loadSharingUsers();
    }
  }

  closeSharingModal(): void {
    if (this.savingSharing) {
      return;
    }

    this.sharingModalOpen = false;
    this.sharingSelection.clear();
  }

  toggleSharingUser(usuarioId: string, checked: boolean): void {
    if (checked) {
      this.sharingSelection.add(usuarioId);
      return;
    }

    this.sharingSelection.delete(usuarioId);
  }

  saveSharing(): void {
    const levantamento = this.activeLevantamento;
    if (!levantamento) {
      return;
    }

    this.savingSharing = true;
    this.levantamentoService.compartilhar(levantamento.id, {
      usuarioIds: Array.from(this.sharingSelection),
    }).subscribe({
      next: (updated) => {
        this.savingSharing = false;
        this.applyUpdatedLevantamento(updated);
        this.closeSharingModal();
        this.toastr.success('Compartilhamento atualizado com sucesso.');
      },
      error: (error) => {
        this.savingSharing = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível atualizar o compartilhamento.');
      },
    });
  }

  goToLevantamentoStep(): void {
    this.currentStep = 'levantamento';
  }

  goToLeituraStep(): void {
    if (!this.activeLevantamento) {
      this.toastr.warning('Crie ou selecione um levantamento para continuar.');
      return;
    }

    this.pendingItem = null;
    this.currentStep = 'leitura';
  }

  startQrFlow(): void {
    if (!this.activeLevantamento) {
      this.toastr.warning('Crie ou selecione um levantamento antes de ler os tombamentos.');
      return;
    }

    if (this.scannerStarting || this.readingCode || this.consultaEmAndamento) {
      return;
    }

    if (this.canUseLiveScanner) {
      void this.openScanner();
      return;
    }

    this.identificationInput?.nativeElement.click();
  }

  confirmManualTombamento(): void {
    if (!this.activeLevantamento) {
      this.toastr.warning('Crie ou selecione um levantamento antes de confirmar itens.');
      return;
    }

    if (!this.manualTombamento.trim() && !this.manualTombamentoAntigo.trim()) {
      this.toastr.warning('Informe o tombamento do E-Estado ou o tombamento antigo.');
      return;
    }

    if (!this.manualTombamento.trim() && this.manualTombamentoAntigo.trim() && !this.manualDescricao.trim()) {
      this.toastr.warning('Informe a descrição do item quando houver apenas tombamento antigo.');
      return;
    }

    this.handleDetectedCode(this.manualTombamento, this.manualTombamentoAntigo, this.manualDescricao);
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

  confirmPendingItem(): void {
    if (!this.activeLevantamento || !this.pendingItem) {
      return;
    }

    this.confirmingItem = true;
    this.levantamentoService.confirmarItem(
      this.activeLevantamento.id,
      this.pendingItem.tombamento,
      this.pendingItem.tombamentoAntigo,
      this.pendingItem.descricao
    ).subscribe({
      next: (item) => {
        this.confirmingItem = false;
        this.applyConfirmedItem(item);
        this.pendingItem = null;
        this.manualTombamento = '';
        this.manualTombamentoAntigo = '';
        this.manualDescricao = '';
        this.codeReadMessage = 'Item confirmado e adicionado ao levantamento.';
        this.currentStep = 'leitura';
        this.toastr.success('Item confirmado com sucesso.');
      },
      error: (error) => {
        this.confirmingItem = false;
        this.toastr.error(error?.error?.message ?? 'Não foi possível confirmar o item no levantamento.');
      },
    });
  }

  cancelPendingItem(): void {
    this.pendingItem = null;
    this.codeReadMessage = '';
    this.currentStep = this.activeLevantamento ? 'leitura' : 'levantamento';
  }

  private handleDetectedCode(rawValue: string, tombamentoAntigoManual = '', descricaoManual = ''): void {
    const activeLevantamento = this.activeLevantamento;
    if (!activeLevantamento) {
      this.toastr.warning('Crie ou selecione um levantamento antes de ler os tombamentos.');
      return;
    }

    const tombamento = this.formatTombamentoValue(rawValue);
    const tombamentoAntigoNormalizado = this.normalizeTombamentoAntigoValue(tombamentoAntigoManual);
    const descricaoNormalizada = descricaoManual.trim();

    if (!tombamento && !tombamentoAntigoNormalizado) {
      this.toastr.warning('Não foi possível identificar um tombamento válido.');
      return;
    }

    if (activeLevantamento.itens.some((item) =>
      (tombamento && item.tombamento === tombamento)
      || (!tombamento && tombamentoAntigoNormalizado && item.tombamentoAntigo === tombamentoAntigoNormalizado)
    )) {
      this.toastr.info('Esse tombamento já foi confirmado neste levantamento.');
      this.pendingItem = null;
      this.closeScanner();
      return;
    }

    if (!tombamento && tombamentoAntigoNormalizado) {
      this.pendingItem = {
        tombamento: '',
        tombamentoAntigo: tombamentoAntigoNormalizado,
        descricao: descricaoNormalizada,
        tipo: '',
        urlConsulta: '',
      };
      this.codeReadMessage = 'Item manual pronto para confirmação.';
      this.currentStep = 'confirmacao';
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
          this.pendingItem = this.mapResumoToPreview(resumo, tombamento, tombamentoAntigoManual, descricaoManual);
          this.codeReadMessage = 'Resumo do item carregado. Confirme para adicionar ao levantamento.';
          this.currentStep = 'confirmacao';
          this.closeScanner();
        },
        error: (error) => {
          if (error?.status === 404) {
            this.pendingItem = {
              tombamento,
              tombamentoAntigo: this.normalizeTombamentoAntigoValue(tombamentoAntigoManual),
              descricao: descricaoNormalizada || `Item ${tombamento}`,
              tipo: '',
              urlConsulta: '',
            };
            this.codeReadMessage = 'Resumo público não localizado. Confirme o tombamento para registrar no levantamento.';
            this.currentStep = 'confirmacao';
            this.closeScanner();
            return;
          }

          this.toastr.error('Não foi possível consultar o tombamento informado.');
        },
      });
  }

  private applyConfirmedItem(item: LevantamentoItem): void {
    this.levantamentos = this.levantamentos.map((levantamento) => {
      if (levantamento.id !== this.activeLevantamentoId) {
        return levantamento;
      }

      return {
        ...levantamento,
        itens: [item, ...levantamento.itens],
      };
    });
  }

  private applyUpdatedLevantamento(updated: Levantamento): void {
    this.levantamentos = this.levantamentos.map((levantamento) =>
      levantamento.id === updated.id ? updated : levantamento
    );
  }

  private loadSharingUsers(): void {
    this.loadingSharingUsers = true;
    this.authService.getLevantamentoUsers().subscribe({
      next: (usuarios) => {
        this.usuariosLevantamento = usuarios;
        this.loadingSharingUsers = false;
      },
      error: () => {
        this.loadingSharingUsers = false;
        this.toastr.error('Não foi possível carregar os usuários para compartilhamento.');
      },
    });
  }

  private mapResumoToPreview(resumo: ConsultaPublicaBem, tombamento: string, tombamentoAntigoManual = '', descricaoManual = ''): LevantamentoItemPreview {
    const tombamentoAntigoNormalizado = this.normalizeTombamentoAntigoValue(tombamentoAntigoManual);

    return {
      tombamento: this.formatTombamentoValue(resumo.tombamento || tombamento),
      tombamentoAntigo: tombamentoAntigoNormalizado || this.normalizeTombamentoAntigoValue(resumo.tombamentoAntigo),
      descricao: resumo.descricao || resumo.tipo || descricaoManual.trim() || `Item ${tombamento}`,
      tipo: resumo.tipo || '',
      urlConsulta: resumo.urlConsulta || '',
    };
  }

  private normalizeTombamentoAntigoValue(value: string | null | undefined): string {
    const normalized = (value ?? '').replace(/\./g, '').trim();
    const meaningfulValue = normalized.replace(/[-\s]/g, '');

    if (!/[A-Za-z0-9]/.test(meaningfulValue)) {
      return '';
    }

    return normalized;
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
    const canvas = await this.renderImageToCanvas(file, LevantamentosComponent.QR_IMAGE_MAX_DIMENSION);
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
