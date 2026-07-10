import { Component, OnDestroy, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { LaudoTecnico, LaudoTecnicoIdentificacaoPayload } from '../../contracts/laudo-tecnico.model';
import { LaudoTecnicoService } from '../../contracts/laudo-tecnico.service';

@Component({
  selector: 'app-laudos-tecnicos',
  templateUrl: './laudos-tecnicos.component.html',
  styleUrl: './laudos-tecnicos.component.scss',
})
export class LaudosTecnicosComponent implements OnInit, OnDestroy {
  laudos: LaudoTecnico[] = [];
  loading = false;
  selectedClassificacao = '';
  selectedConclusao = '';
  activeLaudo: LaudoTecnico | null = null;
  loadingModal = false;
  editingIdentificacao = false;
  savingIdentificacao = false;
  identificacaoForm: LaudoTecnicoIdentificacaoPayload = this.emptyIdentificacao();
  photoUrls = new Map<string, string>();

  constructor(
    private readonly laudoTecnicoService: LaudoTecnicoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLaudos();
  }

  ngOnDestroy(): void {
    this.clearPhotoUrls();
  }

  get classificacaoOptions(): string[] {
    return [...new Set(this.laudos.map((item) => item.classificacaoTecnica).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get conclusaoOptions(): string[] {
    return [...new Set(this.laudos.map((item) => item.conclusaoCondicao).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  get filteredLaudos(): LaudoTecnico[] {
    return this.laudos.filter((item) => {
      const matchesClassificacao = !this.selectedClassificacao || item.classificacaoTecnica === this.selectedClassificacao;
      const matchesConclusao = !this.selectedConclusao || item.conclusaoCondicao === this.selectedConclusao;
      return matchesClassificacao && matchesConclusao;
    });
  }

  loadLaudos(): void {
    this.loading = true;
    this.laudoTecnicoService.getAll().subscribe({
      next: (data) => {
        this.laudos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Nao foi possivel carregar os laudos tecnicos.');
      },
    });
  }

  openDetails(id: string): void {
    this.loadingModal = true;
    this.activeLaudo = null;
    this.laudoTecnicoService.getById(id).subscribe({
      next: (laudo) => {
        this.activeLaudo = laudo;
        this.identificacaoForm = this.mapIdentificacao(laudo);
        this.loadPhotoUrls(laudo);
        this.loadingModal = false;
      },
      error: () => {
        this.loadingModal = false;
        this.toastr.error('Nao foi possivel carregar os detalhes do laudo.');
      },
    });
  }

  closeModal(): void {
    this.clearPhotoUrls();
    this.activeLaudo = null;
    this.loadingModal = false;
    this.editingIdentificacao = false;
  }

  editIdentificacao(): void {
    if (!this.activeLaudo) {
      return;
    }

    this.identificacaoForm = this.mapIdentificacao(this.activeLaudo);
    this.editingIdentificacao = true;
  }

  cancelIdentificacao(): void {
    this.editingIdentificacao = false;
  }

  saveIdentificacao(): void {
    if (!this.activeLaudo) {
      return;
    }

    this.savingIdentificacao = true;
    this.laudoTecnicoService.updateIdentificacao(this.activeLaudo.id, this.identificacaoForm).subscribe({
      next: (laudo) => {
        this.activeLaudo = laudo;
        this.laudos = this.laudos.map((item) => item.id === laudo.id ? laudo : item);
        this.savingIdentificacao = false;
        this.editingIdentificacao = false;
        this.toastr.success('Identificação do laudo salva com sucesso.');
      },
      error: (error) => {
        this.savingIdentificacao = false;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel salvar a identificacao do laudo.');
      },
    });
  }

  printActiveLaudo(): void {
    if (typeof window === 'undefined' || !this.activeLaudo) {
      return;
    }

    window.print();
  }

  formatList(values: string[]): string {
    return values.length > 0 ? values.join(', ') : '-';
  }

  photoUrl(fotoId: string): string {
    return this.photoUrls.get(fotoId) ?? '';
  }

  private loadPhotoUrls(laudo: LaudoTecnico): void {
    this.clearPhotoUrls();
    laudo.fotos.forEach((foto) => {
      this.laudoTecnicoService.getFoto(laudo.id, foto.id).subscribe({
        next: (blob) => this.photoUrls.set(foto.id, URL.createObjectURL(blob)),
      });
    });
  }

  private clearPhotoUrls(): void {
    this.photoUrls.forEach((url) => URL.revokeObjectURL(url));
    this.photoUrls.clear();
  }

  private mapIdentificacao(laudo: LaudoTecnico): LaudoTecnicoIdentificacaoPayload {
    return {
      processoSei: laudo.processoSei,
      idDevolucaoSei: laudo.idDevolucaoSei,
      unidadeGestora: laudo.unidadeGestora,
      setor: laudo.setor,
      dataAvaliacao: laudo.dataAvaliacao?.substring(0, 10) ?? null,
    };
  }

  private emptyIdentificacao(): LaudoTecnicoIdentificacaoPayload {
    return {
      processoSei: '',
      idDevolucaoSei: '',
      unidadeGestora: '',
      setor: '',
      dataAvaliacao: null,
    };
  }
}
