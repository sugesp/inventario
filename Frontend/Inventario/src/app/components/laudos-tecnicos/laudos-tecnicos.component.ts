import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { LaudoTecnico } from '../../contracts/laudo-tecnico.model';
import { LaudoTecnicoService } from '../../contracts/laudo-tecnico.service';

@Component({
  selector: 'app-laudos-tecnicos',
  templateUrl: './laudos-tecnicos.component.html',
  styleUrl: './laudos-tecnicos.component.scss',
})
export class LaudosTecnicosComponent implements OnInit {
  laudos: LaudoTecnico[] = [];
  loading = false;
  selectedClassificacao = '';
  selectedConclusao = '';
  activeLaudo: LaudoTecnico | null = null;
  loadingModal = false;

  constructor(
    private readonly laudoTecnicoService: LaudoTecnicoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLaudos();
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
        this.loadingModal = false;
      },
      error: () => {
        this.loadingModal = false;
        this.toastr.error('Nao foi possivel carregar os detalhes do laudo.');
      },
    });
  }

  closeModal(): void {
    this.activeLaudo = null;
    this.loadingModal = false;
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
}
