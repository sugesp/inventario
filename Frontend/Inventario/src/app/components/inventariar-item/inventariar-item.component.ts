import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import jsQR from 'jsqr';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ConsultaPublicaBem } from '../../contracts/item-inventariado.model';
import { ItemInventariadoService } from '../../contracts/item-inventariado.service';
import { Local } from '../../contracts/local.model';
import { LocalService } from '../../contracts/local.service';

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

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

type InventoryStep = 'local' | 'capture' | 'details' | 'classificacao' | 'photoEtiqueta' | 'photoFrontal' | 'photoTraseira';
type PhotoTarget = 'etiqueta' | 'frontal' | 'traseira';

interface ItemInventarioForm {
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  status: string;
  observacao: string;
}

interface PersistedInventoryState {
  selectedLocalId: string;
  activeStep: InventoryStep;
  form: ItemInventarioForm;
  consultaPublicaMensagem: string;
  consultaPublicaResumo: ConsultaPublicaBem | null;
  aguardandoConfirmacaoResumo: boolean;
}

@Component({
  selector: 'app-inventariar-item',
  templateUrl: './inventariar-item.component.html',
  styleUrl: './inventariar-item.component.scss',
})
export class InventariarItemComponent implements OnInit, OnDestroy {
  private static readonly CLASSIFICACOES = ['SERVIVEL', 'INSERVIVEL', 'OBSOLETO'] as const;
  private static readonly QR_IMAGE_MAX_DIMENSION = 1600;
  private static readonly UPLOAD_IMAGE_MAX_DIMENSION = 1920;
  private static readonly UPLOAD_IMAGE_QUALITY = 0.82;
  private static readonly PHOTO_CAPTURE_MAX_DIMENSION = 1600;
  private static readonly STORAGE_KEY = 'inventario.flow.state';

  @ViewChild('scannerVideo') scannerVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('photoCaptureVideo') photoCaptureVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('identificationInput') identificationInput?: ElementRef<HTMLInputElement>;
  @ViewChild('etiquetaPhotoInput') etiquetaPhotoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('frontalPhotoInput') frontalPhotoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('traseiraPhotoInput') traseiraPhotoInput?: ElementRef<HTMLInputElement>;

  locais: Local[] = [];
  selectedLocalId = '';
  activeStep: InventoryStep = 'local';
  loadingLocais = false;
  saving = false;
  readingCode = false;
  processingPhoto = false;
  scannerOpen = false;
  scannerStarting = false;
  photoCaptureOpen = false;
  photoCaptureStarting = false;
  photoCaptureError = '';
  photoCaptureTarget: PhotoTarget | null = null;
  etiquetaPhoto: SelectedPhoto | null = null;
  frontalPhoto: SelectedPhoto | null = null;
  traseiraPhoto: SelectedPhoto | null = null;
  codeReadMessage = '';
  scannerMessage = '';
  consultaPublicaEmAndamento = false;
  consultaPublicaMensagem = '';
  consultaPublicaResumo: ConsultaPublicaBem | null = null;
  aguardandoConfirmacaoResumo = false;
  private scannerStream: MediaStream | null = null;
  private scannerFrameId: number | null = null;
  private scannerDetector: InstanceType<NonNullable<typeof window.BarcodeDetector>> | null = null;
  private scannerCanvas: HTMLCanvasElement | null = null;
  private photoCaptureStream: MediaStream | null = null;

  form: ItemInventarioForm = this.createEmptyForm();

  constructor(
    readonly authService: AuthService,
    private readonly localService: LocalService,
    private readonly itemInventariadoService: ItemInventariadoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLocais();
    this.restoreState();
  }

  ngOnDestroy(): void {
    this.stopScanner();
    this.stopPhotoCapture();
    this.releasePhoto(this.etiquetaPhoto);
    this.releasePhoto(this.frontalPhoto);
    this.releasePhoto(this.traseiraPhoto);
  }

  get locaisDisponiveis(): Local[] {
    const equipeId = this.authService.session?.equipeId;
    if (!equipeId || this.authService.isAdmin) {
      return this.locais;
    }

    return this.locais.filter((item) => item.equipeId === equipeId);
  }

  get localSelecionado(): Local | null {
    return this.locaisDisponiveis.find((item) => item.id === this.selectedLocalId) ?? null;
  }

  get canAdvanceToScan(): boolean {
    return !!this.selectedLocalId;
  }

  get canUseLiveScanner(): boolean {
    return typeof window !== 'undefined'
      && window.isSecureContext
      && !!navigator.mediaDevices?.getUserMedia;
  }

  get canUseInPageCamera(): boolean {
    return this.canUseLiveScanner;
  }

  get isLocalStep(): boolean {
    return this.activeStep === 'local';
  }

  get isCaptureStep(): boolean {
    return this.activeStep === 'capture';
  }

  get isDetailsStep(): boolean {
    return this.activeStep === 'details';
  }

  get isClassificationStep(): boolean {
    return this.activeStep === 'classificacao';
  }

  get isPhotoEtiquetaStep(): boolean {
    return this.activeStep === 'photoEtiqueta';
  }

  get isPhotoFrontalStep(): boolean {
    return this.activeStep === 'photoFrontal';
  }

  get isPhotoTraseiraStep(): boolean {
    return this.activeStep === 'photoTraseira';
  }

  get canSubmit(): boolean {
    return !!this.selectedLocalId
      && !!this.form.descricao.trim()
      && !!this.form.status.trim()
      && !!this.etiquetaPhoto
      && !!this.frontalPhoto
      && !!this.traseiraPhoto;
  }

  get saveBlockingReasons(): string[] {
    const reasons: string[] = [];

    if (!this.selectedLocalId) {
      reasons.push('Selecione o local do item.');
    }

    if (!this.form.descricao.trim()) {
      reasons.push('Preencha a descrição do item.');
    }

    if (!this.form.status.trim()) {
      reasons.push('Selecione a classificação do item.');
    }

    if (!this.etiquetaPhoto) {
      reasons.push(this.form.tombamentoNovo.trim()
        ? 'Registre a foto da etiqueta de tombamento.'
        : 'Registre a foto do número de série ou identificação.');
    }

    if (!this.frontalPhoto) {
      reasons.push('Registre a foto da parte frontal do item.');
    }

    if (!this.traseiraPhoto) {
      reasons.push('Registre a foto da parte traseira do item.');
    }

    return reasons;
  }

  get identificationStepTitle(): string {
    return this.form.tombamentoNovo.trim()
      ? 'Foto da etiqueta de tombamento'
      : 'Foto do número de série ou identificação';
  }

  get identificationStepDescription(): string {
    return this.form.tombamentoNovo.trim()
      ? 'Registre a etiqueta do tombamento de forma nítida.'
      : 'Como o item não possui tombamento, registre o número de série ou outra identificação visível.';
  }

  get classificacaoOptions(): Array<{ value: string; label: string; description: string }> {
    return [
      { value: 'SERVIVEL', label: 'SERVÍVEL', description: 'Item em condições de uso.' },
      { value: 'INSERVIVEL', label: 'INSERVÍVEL', description: 'Item sem condição de uso.' },
      { value: 'OBSOLETO', label: 'OBSOLETO', description: 'Item defasado ou sem utilidade operacional.' },
    ];
  }

  get classificacaoSelecionadaLabel(): string {
    return this.classificacaoOptions.find((item) => item.value === this.form.status)?.label ?? this.form.status ?? '';
  }

  loadLocais(): void {
    this.loadingLocais = true;
    this.localService.getAll().subscribe({
      next: (data) => {
        this.locais = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
        this.loadingLocais = false;
        this.persistState();
      },
      error: () => {
        this.loadingLocais = false;
        this.toastr.error('Não foi possível carregar os locais.');
      },
    });
  }

  async onIdentificationPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.clearConsultaPublica();
    this.codeReadMessage = '';
    await this.readCodeFromFile(file);
    this.activeStep = 'details';
    this.persistState();
    input.value = '';
  }

  startQrFlow(): void {
    if (!this.canAdvanceToScan || this.scannerStarting || this.readingCode) {
      return;
    }

    if (this.canUseLiveScanner) {
      void this.openScanner();
      return;
    }

    this.identificationInput?.nativeElement.click();
  }

  startManualFlow(): void {
    if (!this.canAdvanceToScan) {
      return;
    }

    this.clearConsultaPublica();
    this.codeReadMessage = '';
    this.activeStep = 'details';
    this.persistState();
  }

  async openScanner(): Promise<void> {
    if (!this.canAdvanceToScan || this.scannerStarting || this.scannerOpen) {
      return;
    }

    if (!this.canUseLiveScanner) {
      this.scannerMessage = 'A câmera ao vivo do navegador exige HTTPS ou localhost. Neste acesso por HTTP, use a foto do tombamento.';
      return;
    }

    this.scannerStarting = true;
    this.scannerMessage = '';
    this.codeReadMessage = '';

    try {
      const detector = await this.createDetector();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      this.scannerDetector = detector;
      this.scannerCanvas = document.createElement('canvas');
      this.scannerStream = stream;
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
    this.stopScanner();
    this.scannerOpen = false;
  }

  async openPhotoCapture(target: PhotoTarget): Promise<void> {
    if (this.photoCaptureStarting || this.processingPhoto || !this.canUseInPageCamera) {
      this.openPhotoPickerFallback(target);
      return;
    }

    this.photoCaptureStarting = true;
    this.photoCaptureError = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });

      this.photoCaptureStream = stream;
      this.photoCaptureTarget = target;
      this.photoCaptureOpen = true;

      setTimeout(() => {
        const video = this.photoCaptureVideo?.nativeElement;
        if (!video || !this.photoCaptureStream) {
          return;
        }

        video.srcObject = this.photoCaptureStream;
        video.setAttribute('playsinline', 'true');
        video.play().catch(() => {
          this.photoCaptureError = 'Não foi possível iniciar a câmera.';
          this.closePhotoCapture();
        });
      });
    } catch {
      this.photoCaptureError = 'Não foi possível acessar a câmera do dispositivo.';
      this.openPhotoPickerFallback(target);
    } finally {
      this.photoCaptureStarting = false;
    }
  }

  closePhotoCapture(): void {
    this.stopPhotoCapture();
    this.photoCaptureOpen = false;
    this.photoCaptureTarget = null;
  }

  async capturePhoto(): Promise<void> {
    const video = this.photoCaptureVideo?.nativeElement;
    const target = this.photoCaptureTarget;
    if (!video || !target || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    this.processingPhoto = true;

    try {
      const canvas = document.createElement('canvas');
      const sourceWidth = video.videoWidth || 1280;
      const sourceHeight = video.videoHeight || 720;
      const scale = Math.min(1, InventariarItemComponent.PHOTO_CAPTURE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Falha ao capturar foto.');
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await this.canvasToBlob(canvas, 'image/jpeg', InventariarItemComponent.UPLOAD_IMAGE_QUALITY);
      if (!blob) {
        throw new Error('Falha ao gerar foto.');
      }

      const file = new File(
        [blob],
        `inventario-${target}-${Date.now()}.jpg`,
        { type: 'image/jpeg', lastModified: Date.now() }
      );

      this.assignSelectedPhoto(target, this.createSelectedPhoto(file));
      this.closePhotoCapture();
      this.persistState();
    } catch {
      this.toastr.warning('Não foi possível capturar a foto. Tente novamente.');
    } finally {
      this.processingPhoto = false;
    }
  }

  async readCodeFromFile(file: File): Promise<void> {
    this.readingCode = true;

    try {
      const rawValue = await this.detectCodeFromImageFile(file);

      if (rawValue) {
        this.form.tombamentoNovo = this.formatTombamentoValue(rawValue);
        this.codeReadMessage = 'Tombamento identificado automaticamente pela imagem.';
        this.consultarResumoPublico();
        this.persistState();
      } else {
        this.codeReadMessage = 'Não foi possível ler o QR code. Você pode informar o tombamento manualmente.';
      }
    } catch {
      this.codeReadMessage = 'Falha ao processar a imagem do tombamento.';
    } finally {
      this.readingCode = false;
    }
  }

  submit(): void {
    if (!this.canSubmit) {
      this.toastr.warning(this.saveBlockingReasons[0] ?? 'Confira os dados obrigatórios antes de salvar.');
      return;
    }

    const payload = new FormData();
    payload.append('localId', this.selectedLocalId);
    payload.append('tombamentoNovo', this.form.tombamentoNovo.trim());
    payload.append('tombamentoAntigo', this.form.tombamentoAntigo.trim());
    payload.append('descricao', this.form.descricao.trim());
    payload.append('status', this.form.status.trim());
    payload.append('observacao', this.form.observacao.trim());
    payload.append('fotos', this.etiquetaPhoto!.file, this.etiquetaPhoto!.file.name);
    payload.append('fotos', this.frontalPhoto!.file, this.frontalPhoto!.file.name);
    payload.append('fotos', this.traseiraPhoto!.file, this.traseiraPhoto!.file.name);

    this.saving = true;
    this.itemInventariadoService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Item inventariado cadastrado com sucesso.');
        this.resetFlow();
      },
      error: (error) => {
        this.saving = false;
        const validationErrors = error?.error?.errors
          ? Object.values(error.error.errors).flat().filter((item): item is string => typeof item === 'string')
          : [];
        const message =
          validationErrors[0]
          ?? error?.error?.message
          ?? error?.error?.title
          ?? (typeof error?.error === 'string' ? error.error : null)
          ?? 'Não foi possível salvar o item inventariado.';
        this.toastr.error(message);
      },
    });
  }

  resetFlow(): void {
    this.closeScanner();
    this.releasePhoto(this.etiquetaPhoto);
    this.releasePhoto(this.frontalPhoto);
    this.releasePhoto(this.traseiraPhoto);
    this.etiquetaPhoto = null;
    this.frontalPhoto = null;
    this.traseiraPhoto = null;
    this.clearConsultaPublica();
    this.codeReadMessage = '';
    this.activeStep = this.selectedLocalId ? 'capture' : 'local';
    this.form = this.createEmptyForm();
    this.persistState();
  }

  selectLocal(localId: string): void {
    this.selectedLocalId = localId;
    this.activeStep = 'capture';
    this.clearConsultaPublica();
    this.codeReadMessage = '';
    this.persistState();
  }

  goToLocalStep(): void {
    this.closeScanner();
    this.activeStep = 'local';
    this.persistState();
  }

  goToCaptureStep(): void {
    if (!this.canAdvanceToScan) {
      return;
    }

    this.closeScanner();
    this.activeStep = 'capture';
    this.persistState();
  }

  goToPhotoEtiquetaStep(): void {
    if (!this.form.status.trim()) {
      return;
    }

    this.activeStep = 'photoEtiqueta';
    this.persistState();
  }

  goToClassificationStep(): void {
    this.activeStep = 'classificacao';
    this.persistState();
  }

  goToPhotoFrontalStep(): void {
    if (!this.etiquetaPhoto) {
      return;
    }

    this.activeStep = 'photoFrontal';
    this.persistState();
  }

  goToPhotoTraseiraStep(): void {
    if (!this.etiquetaPhoto || !this.frontalPhoto) {
      return;
    }

    this.activeStep = 'photoTraseira';
    this.persistState();
  }

  async onEtiquetaPhotoSelected(event: Event): Promise<void> {
    this.etiquetaPhoto = await this.assignStepPhoto(this.etiquetaPhoto, event);
  }

  async onFrontalPhotoSelected(event: Event): Promise<void> {
    this.frontalPhoto = await this.assignStepPhoto(this.frontalPhoto, event);
  }

  async onTraseiraPhotoSelected(event: Event): Promise<void> {
    this.traseiraPhoto = await this.assignStepPhoto(this.traseiraPhoto, event);
  }

  removeEtiquetaPhoto(): void {
    this.releasePhoto(this.etiquetaPhoto);
    this.etiquetaPhoto = null;
    this.persistState();
  }

  removeFrontalPhoto(): void {
    this.releasePhoto(this.frontalPhoto);
    this.frontalPhoto = null;
    this.persistState();
  }

  removeTraseiraPhoto(): void {
    this.releasePhoto(this.traseiraPhoto);
    this.traseiraPhoto = null;
    this.persistState();
  }

  private createSelectedPhoto(file: File): SelectedPhoto {
    return {
      file,
      previewUrl: URL.createObjectURL(file),
    };
  }

  private releasePhoto(photo: SelectedPhoto | null | undefined): void {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  }

  private assignSelectedPhoto(target: PhotoTarget, photo: SelectedPhoto | null): void {
    if (target === 'etiqueta') {
      this.releasePhoto(this.etiquetaPhoto);
      this.etiquetaPhoto = photo;
      return;
    }

    if (target === 'frontal') {
      this.releasePhoto(this.frontalPhoto);
      this.frontalPhoto = photo;
      return;
    }

    this.releasePhoto(this.traseiraPhoto);
    this.traseiraPhoto = photo;
  }

  private async assignStepPhoto(currentPhoto: SelectedPhoto | null, event: Event): Promise<SelectedPhoto | null> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return currentPhoto;
    }

    this.processingPhoto = true;

    try {
      const optimizedFile = await this.optimizeImageFile(
        file,
        InventariarItemComponent.UPLOAD_IMAGE_MAX_DIMENSION,
        InventariarItemComponent.UPLOAD_IMAGE_QUALITY
      );

      this.releasePhoto(currentPhoto);
      input.value = '';
      return this.createSelectedPhoto(optimizedFile);
    } catch {
      input.value = '';
      this.toastr.warning('Não foi possível preparar a foto. Tente novamente com outra imagem.');
      return currentPhoto;
    } finally {
      this.processingPhoto = false;
    }
  }

  private openPhotoPickerFallback(target: PhotoTarget): void {
    if (target === 'etiqueta') {
      this.etiquetaPhotoInput?.nativeElement.click();
      return;
    }

    if (target === 'frontal') {
      this.frontalPhotoInput?.nativeElement.click();
      return;
    }

    this.traseiraPhotoInput?.nativeElement.click();
  }

  private createEmptyForm(): ItemInventarioForm {
    return {
      tombamentoNovo: '',
      tombamentoAntigo: '',
      descricao: '',
      status: '',
      observacao: '',
    };
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
          this.form.tombamentoNovo = this.formatTombamentoValue(rawValue);
          this.codeReadMessage = 'Tombamento identificado automaticamente pela câmera.';
          this.consultarResumoPublico();
          this.activeStep = 'details';
          this.closeScanner();
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

  private stopScanner(): void {
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

    this.scannerCanvas = null;
  }

  private stopPhotoCapture(): void {
    const video = this.photoCaptureVideo?.nativeElement;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    if (this.photoCaptureStream) {
      this.photoCaptureStream.getTracks().forEach((track) => track.stop());
      this.photoCaptureStream = null;
    }
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
    const canvas = await this.renderImageToCanvas(file, InventariarItemComponent.QR_IMAGE_MAX_DIMENSION);
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

  private async optimizeImageFile(file: File, maxDimension: number, quality: number): Promise<File> {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    const canvas = await this.renderImageToCanvas(file, maxDimension);
    const blob = await this.canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) {
      return file;
    }

    return new File([blob], this.toJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  private toJpegName(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      return `${fileName || 'foto'}.jpg`;
    }

    return `${fileName.slice(0, lastDotIndex)}.jpg`;
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
      // Not a URL, continue with generic normalization.
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

  consultarResumoPublico(): void {
    const tombamento = this.normalizeScannedValue(this.form.tombamentoNovo);
    if (!tombamento) {
      this.clearConsultaPublica();
      return;
    }

    this.consultaPublicaEmAndamento = true;
    this.consultaPublicaMensagem = '';
    this.consultaPublicaResumo = null;
    this.aguardandoConfirmacaoResumo = false;

    this.itemInventariadoService
      .consultarResumoPublico(tombamento)
      .pipe(finalize(() => {
        this.consultaPublicaEmAndamento = false;
      }))
      .subscribe({
        next: (resumo) => {
          this.consultaPublicaResumo = resumo;
          this.aguardandoConfirmacaoResumo = true;
          this.consultaPublicaMensagem = 'Confira abaixo se a descrição condiz com o equipamento inventariado.';
          this.form.tombamentoNovo = this.formatTombamentoValue(resumo.tombamento || tombamento);
          this.form.tombamentoAntigo = resumo.tombamentoAntigo || this.form.tombamentoAntigo;
          if (resumo.descricao) {
            this.form.descricao = resumo.descricao;
          }
          this.persistState();
        },
        error: (error) => {
          this.consultaPublicaResumo = null;
          this.aguardandoConfirmacaoResumo = false;
          this.consultaPublicaMensagem = error?.status === 404
            ? 'Nenhum resumo público foi encontrado para esse tombamento. Você pode continuar manualmente.'
            : 'Não foi possível consultar o resumo público agora. Você pode continuar manualmente.';
          this.persistState();
        },
      });
  }

  confirmarResumo(condiz: boolean): void {
    if (!condiz) {
      this.toastr.info('Você poderá ajustar a descrição manualmente antes de salvar.');
    }

    this.aguardandoConfirmacaoResumo = false;
    this.persistState();
  }

  onTombamentoNovoChange(value: string): void {
    this.form.tombamentoNovo = this.formatTombamentoValue(value);
    this.persistState();
  }

  selecionarClassificacao(status: string): void {
    if (!InventariarItemComponent.CLASSIFICACOES.includes(status as typeof InventariarItemComponent.CLASSIFICACOES[number])) {
      return;
    }

    this.form.status = status;
    this.persistState();
  }

  onTombamentoNovoBlur(): void {
    const tombamentoNormalizado = this.normalizeScannedValue(this.form.tombamentoNovo);
    if (!tombamentoNormalizado) {
      this.clearConsultaPublica();
      this.form.tombamentoNovo = '';
      return;
    }

    if (this.normalizeScannedValue(this.consultaPublicaResumo?.tombamento ?? '') === tombamentoNormalizado) {
      this.form.tombamentoNovo = this.formatTombamentoValue(tombamentoNormalizado);
      this.persistState();
      return;
    }

    this.form.tombamentoNovo = this.formatTombamentoValue(tombamentoNormalizado);
    this.persistState();
    this.consultarResumoPublico();
  }

  private clearConsultaPublica(): void {
    this.consultaPublicaEmAndamento = false;
    this.consultaPublicaMensagem = '';
    this.consultaPublicaResumo = null;
    this.aguardandoConfirmacaoResumo = false;
  }

  persistState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const state: PersistedInventoryState = {
      selectedLocalId: this.selectedLocalId,
      activeStep: this.activeStep,
      form: { ...this.form },
      consultaPublicaMensagem: this.consultaPublicaMensagem,
      consultaPublicaResumo: this.consultaPublicaResumo,
      aguardandoConfirmacaoResumo: this.aguardandoConfirmacaoResumo,
    };

    window.sessionStorage.setItem(InventariarItemComponent.STORAGE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.sessionStorage.getItem(InventariarItemComponent.STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const state = JSON.parse(raw) as PersistedInventoryState;
      this.selectedLocalId = state.selectedLocalId ?? '';
      this.activeStep = state.activeStep ?? 'local';
      this.form = {
        tombamentoNovo: state.form?.tombamentoNovo ?? '',
        tombamentoAntigo: state.form?.tombamentoAntigo ?? '',
        descricao: state.form?.descricao ?? '',
        status: state.form?.status ?? '',
        observacao: state.form?.observacao ?? '',
      };
      this.consultaPublicaMensagem = state.consultaPublicaMensagem ?? '';
      this.consultaPublicaResumo = state.consultaPublicaResumo ?? null;
      this.aguardandoConfirmacaoResumo = !!state.aguardandoConfirmacaoResumo;
    } catch {
      window.sessionStorage.removeItem(InventariarItemComponent.STORAGE_KEY);
    }
  }
}
