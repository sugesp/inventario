import { Component, OnInit } from '@angular/core';
import { Aditivo, AditivoPayload, TipoAditivo } from '../../contracts/aditivo.model';
import { AditivoService } from '../../contracts/aditivo.service';
import { Contrato } from '../../contracts/contrato.model';
import { ContratoService } from '../../contracts/contrato.service';
import { ToastrService } from 'ngx-toastr';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

@Component({
  selector: 'app-aditivos',
  templateUrl: './aditivos.component.html',
  styleUrl: './aditivos.component.scss',
})
export class AditivosComponent implements OnInit {
  readonly TipoAditivo = TipoAditivo;
  aditivos: Aditivo[] = [];
  contratos: Contrato[] = [];
  loading = false;
  saving = false;
  editingId: string | null = null;

  form: AditivoPayload = {
    contratoId: '',
    numero: '',
    idSei: '',
    tipo: TipoAditivo.Renovacao,
    observacao: '',
    dataInicio: '',
    novaVigencia: '',
    valor: 0,
  };

  readonly tipoAditivoOptions = [
    { value: TipoAditivo.Renovacao, label: 'Renovação' },
    { value: TipoAditivo.Acrescimo, label: 'Acréscimo' },
    { value: TipoAditivo.Supressao, label: 'Supressão' },
    { value: TipoAditivo.Apostilamento, label: 'Apostilamento' },
  ];

  constructor(
    private readonly aditivoService: AditivoService,
    private readonly contratoService: ContratoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadContratos();
    this.loadAditivos();
  }

  loadContratos(): void {
    this.contratoService.getAll().subscribe({
      next: (data) => {
        this.contratos = data;
        if (!this.form.contratoId && data.length > 0) {
          this.form.contratoId = data[0].id;
        }
      },
      error: () => this.toastr.error('Nao foi possivel carregar contratos.'),
    });
  }

  loadAditivos(): void {
    this.loading = true;
    this.aditivoService.getAll().subscribe({
      next: (data) => {
        this.aditivos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Nao foi possivel carregar aditivos.');
      },
    });
  }

  get contratoOptions(): SearchableSelectOption[] {
    return this.contratos.map((contrato) => ({
      value: contrato.id,
      label: contrato.numero,
    }));
  }

  getTipoAditivoLabel(tipo: TipoAditivo): string {
    return this.tipoAditivoOptions.find((item) => item.value === tipo)?.label || `${tipo}`;
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
    const isRenovacao = this.form.tipo === TipoAditivo.Renovacao;
    const payload: AditivoPayload = {
      ...this.form,
      valor: isRenovacao ? 0 : Number(this.form.valor),
      novaVigencia: isRenovacao ? (this.form.novaVigencia || null) : null,
    };

    const request = this.editingId
      ? this.aditivoService.update(this.editingId, payload)
      : this.aditivoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success(
          this.editingId ? 'Aditivo atualizado com sucesso.' : 'Aditivo cadastrado com sucesso.'
        );
        this.cancel();
        this.loadAditivos();
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Nao foi possivel salvar aditivo.');
      },
    });
  }

  edit(item: Aditivo): void {
    this.editingId = item.id;
    this.form = {
      contratoId: item.contratoId,
      numero: item.numero,
      idSei: item.idSei,
      tipo: item.tipo,
      observacao: item.observacao ?? '',
      dataInicio: this.toDateInput(item.dataInicio),
      novaVigencia: this.toDateInput(item.novaVigencia ?? ''),
      valor: item.valor,
    };
  }

  remove(item: Aditivo): void {
    if (!window.confirm(`Excluir aditivo ${item.numero}?`)) {
      return;
    }

    this.aditivoService.delete(item.id).subscribe({
      next: () => {
        this.toastr.success('Aditivo excluido com sucesso.');
        this.loadAditivos();
      },
      error: () => this.toastr.error('Nao foi possivel excluir aditivo.'),
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form = {
      contratoId: this.contratos[0]?.id ?? '',
      numero: '',
      idSei: '',
      tipo: TipoAditivo.Renovacao,
      observacao: '',
      dataInicio: '',
      novaVigencia: '',
      valor: 0,
    };
  }

  onTipoChange(): void {
    if (this.form.tipo === TipoAditivo.Renovacao) {
      this.form.valor = 0;
      return;
    }

    this.form.novaVigencia = '';
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
