import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Levantamento } from '../../contracts/levantamento.model';
import { LevantamentoService } from '../../contracts/levantamento.service';

@Component({
  selector: 'app-levantamentos-lista',
  templateUrl: './levantamentos-lista.component.html',
  styleUrl: './levantamentos-lista.component.scss',
})
export class LevantamentosListaComponent implements OnInit {
  levantamentos: Levantamento[] = [];
  loading = false;
  activeLevantamento: Levantamento | null = null;
  loadingModal = false;

  constructor(
    private readonly levantamentoService: LevantamentoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadLevantamentos();
  }

  loadLevantamentos(): void {
    this.loading = true;
    this.levantamentoService.getAll().subscribe({
      next: (data) => {
        this.levantamentos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar os levantamentos.');
      },
    });
  }

  openDetails(id: string): void {
    this.loadingModal = true;
    this.activeLevantamento = null;
    this.levantamentoService.getById(id).subscribe({
      next: (levantamento) => {
        this.activeLevantamento = levantamento;
        this.loadingModal = false;
      },
      error: () => {
        this.loadingModal = false;
        this.toastr.error('Não foi possível carregar os detalhes do levantamento.');
      },
    });
  }

  closeModal(): void {
    this.activeLevantamento = null;
    this.loadingModal = false;
  }
}
