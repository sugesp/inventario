import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { Contrato } from '../../../contracts/contrato.model';
import { ContratoService } from '../../../contracts/contrato.service';
import { Fornecedor } from '../../../contracts/fornecedor.model';
import { FornecedorService } from '../../../contracts/fornecedor.service';
import { PageTitleService } from '../../../core/page-title.service';

interface DetailField {
  label: string;
  value: string;
}

@Component({
  selector: 'app-fornecedores-detail',
  templateUrl: './fornecedores-detail.component.html',
  styleUrl: './fornecedores-detail.component.scss',
})
export class FornecedoresDetailComponent implements OnInit {
  fornecedor: Fornecedor | null = null;
  contratos: Contrato[] = [];
  loading = false;
  activeTab: 'visao-geral' | 'contratos' = 'visao-geral';
  showContratoDetailsModal = false;
  contratoDetailsTitle = '';
  contratoDetailsFields: DetailField[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fornecedorService: FornecedorService,
    private readonly contratoService: ContratoService,
    private readonly toastr: ToastrService,
    private readonly pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.toastr.error('Fornecedor invalido.');
      this.router.navigate(['/fornecedores']);
      return;
    }

    this.loadDetails(id);
  }

  back(): void {
    this.router.navigate(['/fornecedores']);
  }

  setActiveTab(tab: 'visao-geral' | 'contratos'): void {
    this.activeTab = tab;
  }

  copyToClipboard(value: string, label = 'Número Processo SEI'): void {
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

  get totalValorContratos(): number {
    return this.contratos.reduce((total, contrato) => total + Number(contrato.valorAtualContrato || 0), 0);
  }

  openContratoDetails(contrato: Contrato): void {
    this.contratoDetailsTitle = `Contrato ${contrato.numero}`;
    this.contratoDetailsFields = [
      { label: 'Número Processo SEI', value: contrato.processo || '-' },
      { label: 'Vigência atual', value: this.formatDate(contrato.vigenciaAtual) },
      { label: 'Valor atual', value: this.formatCurrency(contrato.valorAtualContrato) },
      { label: 'Responsável', value: contrato.responsavelGconv || '-' },
      { label: 'Setor demandante', value: contrato.unidadeDemandanteNome || '-' },
      { label: 'Data de início', value: this.formatDate(contrato.dataInicio) },
    ];
    this.showContratoDetailsModal = true;
  }

  closeContratoDetailsModal(): void {
    this.showContratoDetailsModal = false;
    this.contratoDetailsTitle = '';
    this.contratoDetailsFields = [];
  }

  private loadDetails(id: string): void {
    this.loading = true;

    forkJoin({
      fornecedores: this.fornecedorService.getAll(),
      contratos: this.contratoService.getAll(),
    }).subscribe({
      next: ({ fornecedores, contratos }) => {
        const fornecedor = fornecedores.find((x) => x.id === id) ?? null;
        if (!fornecedor) {
          this.toastr.error('Fornecedor nao encontrado.');
          this.loading = false;
          this.router.navigate(['/fornecedores']);
          return;
        }

        this.fornecedor = fornecedor;
        this.pageTitleService.setPageTitle(`Fornecedor ${fornecedor.nomeFantasia || fornecedor.razaoSocial}`);
        this.contratos = contratos.filter((x) => x.fornecedorId === id);
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Nao foi possivel carregar os detalhes do fornecedor.');
        this.loading = false;
      },
    });
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
