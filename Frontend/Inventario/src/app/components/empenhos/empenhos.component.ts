import { Component, OnInit } from '@angular/core';
import { Empenho, EmpenhoPayload } from '../../contracts/empenho.model';
import { EmpenhoService } from '../../contracts/empenho.service';
import { ExercicioAnual } from '../../contracts/exercicio-anual.model';
import { ExercicioAnualService } from '../../contracts/exercicio-anual.service';
import { ToastrService } from 'ngx-toastr';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

@Component({
  selector: 'app-empenhos',
  templateUrl: './empenhos.component.html',
  styleUrl: './empenhos.component.scss',
})
export class EmpenhosComponent implements OnInit {
  empenhos: Empenho[] = [];
  exercicios: ExercicioAnual[] = [];
  loading = false;
  saving = false;
  editingId: string | null = null;

  form: EmpenhoPayload = {
    exercicioAnualId: '',
    numeroEmpenho: '',
    idSei: '',
    dataEmpenho: '',
    valorEmpenhado: 0,
    fonte: '',
    observacao: '',
  };

  constructor(
    private readonly empenhoService: EmpenhoService,
    private readonly exercicioAnualService: ExercicioAnualService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadExercicios();
    this.loadEmpenhos();
  }

  loadExercicios(): void {
    this.exercicioAnualService.getAll().subscribe({
      next: (data) => {
        this.exercicios = data;
        if (!this.form.exercicioAnualId && data.length > 0) {
          this.form.exercicioAnualId = data[0].id;
        }
      },
      error: () => this.toastr.error('Nao foi possivel carregar exercicios anuais.'),
    });
  }

  loadEmpenhos(): void {
    this.loading = true;
    this.empenhoService.getAll().subscribe({
      next: (data) => {
        this.empenhos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Nao foi possivel carregar empenhos.');
      },
    });
  }

  get exercicioOptions(): SearchableSelectOption[] {
    return this.exercicios.map((exercicio) => ({
      value: exercicio.id,
      label: `${exercicio.ano}`,
    }));
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

  submit(): void {
    this.saving = true;
    const payload: EmpenhoPayload = {
      ...this.form,
      valorEmpenhado: Number(this.form.valorEmpenhado),
    };

    const request = this.editingId
      ? this.empenhoService.update(this.editingId, payload)
      : this.empenhoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.editingId ? 'Empenho atualizado com sucesso.' : 'Empenho cadastrado com sucesso.'
        );
        this.cancel();
        this.loadEmpenhos();
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Nao foi possivel salvar empenho.');
      },
    });
  }

  edit(item: Empenho): void {
    this.editingId = item.id;
    this.form = {
      exercicioAnualId: item.exercicioAnualId,
      numeroEmpenho: item.numeroEmpenho,
      idSei: item.idSei,
      dataEmpenho: this.toDateInput(item.dataEmpenho),
      valorEmpenhado: item.valorEmpenhado,
      fonte: item.fonte,
      observacao: item.observacao ?? '',
    };
  }

  remove(item: Empenho): void {
    if (!window.confirm(`Excluir empenho ${item.numeroEmpenho}?`)) {
      return;
    }

    this.empenhoService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Empenho excluido com sucesso.');
        this.loadEmpenhos();
      },
      error: () => this.toastr.error('Nao foi possivel excluir empenho.'),
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form = {
      exercicioAnualId: this.exercicios[0]?.id ?? '',
      numeroEmpenho: '',
      idSei: '',
      dataEmpenho: '',
      valorEmpenhado: 0,
      fonte: '',
      observacao: '',
    };
  }

  private toDateInput(value: string): string {
    return value ? value.slice(0, 10) : '';
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

    this.toastr.error(`Nao foi possivel copiar ${label.toLowerCase()}.`);
  }
}
