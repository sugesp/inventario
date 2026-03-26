import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Contrato, ContratoPayload, ContratoProcuradorPayload } from '../../contracts/contrato.model';
import { ContratoService } from '../../contracts/contrato.service';
import { Fornecedor, FornecedorCnpjLookup, FornecedorPayload } from '../../contracts/fornecedor.model';
import { FornecedorService } from '../../contracts/fornecedor.service';
import { Unidade } from '../../contracts/unidade.model';
import { UnidadeService } from '../../contracts/unidade.service';
import { ToastrService } from 'ngx-toastr';
import { PageTitleService } from '../../core/page-title.service';
import { SearchableSelectOption } from '../shared/searchable-select/searchable-select.component';

interface UnidadeSelectOption extends SearchableSelectOption {
  value: string;
}

@Component({
  selector: 'app-contratos',
  templateUrl: './contratos.component.html',
  styleUrl: './contratos.component.scss',
})
export class ContratosComponent implements OnInit {
  contratoId = '';
  editMode = false;
  fornecedores: Fornecedor[] = [];
  unidades: Unidade[] = [];
  responsaveisContrato: Array<{ id: string; nome: string; cpf: string }> = [];
  loading = false;
  saving = false;
  savingFornecedor = false;
  loadingFornecedorCnpj = false;
  showFornecedorModal = false;
  private lastFornecedorCnpjLookup = '';

  fornecedorForm: FornecedorPayload = {
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    telefoneContato: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
  };

  form: ContratoPayload = {
    fornecedorId: '',
    unidadeDemandanteId: '',
    numero: '',
    idSei: '',
    prepostoNome: '',
    prepostoNumeroContato: '',
    obs: '',
    processo: '',
    objeto: '',
    observacoesComplementares: '',
    dataInicio: '',
    lei: '14.133/2021',
    vigenciaInicial: '',
    vigenciaMaxima: '',
    responsavelGconv: '',
    valorInicialContratual: 0,
    procuradores: [],
  };

  constructor(
    private readonly authService: AuthService,
    private readonly contratoService: ContratoService,
    private readonly fornecedorService: FornecedorService,
    private readonly unidadeService: UnidadeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly pageTitleService: PageTitleService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.contratoId = id;
      this.editMode = true;
      this.loadContrato(id);
    }

    this.loadFornecedores();
    this.loadUnidades();
    this.loadResponsaveisContrato();
  }

  loadFornecedores(): void {
    this.fornecedorService.getAll().subscribe({
      next: (data) => {
        this.fornecedores = data;
        if (!this.form.fornecedorId && data.length > 0) {
          this.form.fornecedorId = data[0].id;
        }
      },
      error: () => {
        this.toastr.error('Não foi possível carregar os fornecedores.');
      },
    });
  }

  loadUnidades(): void {
    this.unidadeService.getAll().subscribe({
      next: (data) => {
        this.unidades = data;
      },
      error: () => {
        this.toastr.error('Não foi possível carregar as unidades demandantes.');
      },
    });
  }

  loadResponsaveisContrato(): void {
    this.authService.getContratoUsers().subscribe({
      next: (data) => {
        this.responsaveisContrato = data;
        if (!this.form.responsavelGconv && data.length > 0) {
          this.form.responsavelGconv = data[0].nome;
        }
      },
      error: () => {
        this.toastr.error('Não foi possível carregar os usuários do perfil Contratos.');
      },
    });
  }

  submit(): void {
    this.saving = true;
    const payload: ContratoPayload = {
      ...this.form,
      valorInicialContratual: Number(this.form.valorInicialContratual),
      procuradores: this.form.procuradores
        .filter((item) => item.nome.trim() || item.numeroContato.trim() || item.email.trim())
        .map((item) => ({
          nome: item.nome.trim(),
          numeroContato: item.numeroContato.trim(),
          email: item.email.trim(),
        })),
    };

    const request = this.editMode
      ? this.contratoService.update(this.contratoId, payload)
      : this.contratoService.create(payload);

    request.subscribe({
      next: (contrato) => {
        this.saving = false;
        this.toastr.success(this.editMode ? 'Contrato atualizado com sucesso.' : 'Contrato cadastrado com sucesso.');
        this.router.navigate(['/contratos', contrato.id]);
      },
      error: () => {
        this.saving = false;
        this.toastr.error('Não foi possível salvar contrato.');
      },
    });
  }

  back(): void {
    this.router.navigate(['/contratos']);
  }

  openFornecedorModal(): void {
    this.showFornecedorModal = true;
  }

  closeFornecedorModal(): void {
    this.showFornecedorModal = false;
    this.loadingFornecedorCnpj = false;
    this.lastFornecedorCnpjLookup = '';
    this.fornecedorForm = {
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      telefoneContato: '',
      email: '',
      endereco: '',
      cidade: '',
      estado: '',
    };
  }

  createFornecedor(): void {
    this.savingFornecedor = true;
    const payload: FornecedorPayload = {
      ...this.fornecedorForm,
      cnpj: this.onlyDigits(this.fornecedorForm.cnpj),
    };

    this.fornecedorService.create(payload).subscribe({
      next: (created) => {
        this.savingFornecedor = false;
        this.toastr.success('Fornecedor cadastrado com sucesso.');
        this.loadFornecedores();
        this.form.fornecedorId = created.id;
        this.closeFornecedorModal();
      },
      error: () => {
        this.savingFornecedor = false;
        this.toastr.error('Não foi possível cadastrar fornecedor.');
      },
    });
  }

  onFornecedorCnpjInput(value: string): void {
    this.fornecedorForm.cnpj = this.formatCnpj(value);
    this.lookupFornecedorByCnpj(this.fornecedorForm.cnpj);
  }

  get valorAtualPreview(): number {
    return Number(this.form.valorInicialContratual || 0);
  }

  get pageTitle(): string {
    return this.editMode ? 'Editar contrato' : 'Novo contrato';
  }

  get pageSubtitle(): string {
    return this.editMode
      ? 'Atualize os dados principais do instrumento.'
      : 'Preencha os dados principais do instrumento.';
  }

  get submitLabel(): string {
    if (this.saving) {
      return 'Salvando...';
    }

    return this.editMode ? 'Salvar contrato' : 'Cadastrar contrato';
  }

  addProcurador(): void {
    this.form.procuradores = [
      ...this.form.procuradores,
      this.createEmptyProcurador(),
    ];
  }

  removeProcurador(index: number): void {
    this.form.procuradores = this.form.procuradores.filter((_, itemIndex) => itemIndex !== index);
  }

  get fornecedorOptions(): SearchableSelectOption[] {
    return this.fornecedores.map((fornecedor) => ({
      value: fornecedor.id,
      label: `${this.getFornecedorDisplayName(fornecedor)} (${this.formatCnpj(fornecedor.cnpj)})`,
    }));
  }

  get unidadeDemandanteOptions(): UnidadeSelectOption[] {
    return this.buildUnidadeOptions(this.unidades);
  }

  get responsavelOptions(): SearchableSelectOption[] {
    return this.responsaveisContrato.map((responsavel) => ({
      value: responsavel.nome,
      label: `${responsavel.nome} (${responsavel.cpf})`,
    }));
  }

  private buildUnidadeOptions(unidades: Unidade[]): UnidadeSelectOption[] {
    const childrenByParent = new Map<string | null, Unidade[]>();

    for (const unidade of unidades) {
      const parentId = unidade.unidadeSuperiorId ?? null;
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(unidade);
      childrenByParent.set(parentId, siblings);
    }

    for (const siblings of childrenByParent.values()) {
      siblings.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    const options: UnidadeSelectOption[] = [];

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

  private lookupFornecedorByCnpj(value: string): void {
    const cnpj = this.onlyDigits(value);
    if (cnpj.length !== 14 || this.lastFornecedorCnpjLookup === cnpj) {
      return;
    }

    this.lastFornecedorCnpjLookup = cnpj;
    this.loadingFornecedorCnpj = true;
    this.fornecedorService.lookupByCnpj(cnpj).subscribe({
      next: (data) => {
        this.loadingFornecedorCnpj = false;
        if (!data || this.onlyDigits(this.fornecedorForm.cnpj) !== cnpj) {
          this.lastFornecedorCnpjLookup = '';
          return;
        }

        this.applyFornecedorLookup(data);
      },
      error: () => {
        this.loadingFornecedorCnpj = false;
        this.lastFornecedorCnpjLookup = '';
      },
    });
  }

  private applyFornecedorLookup(data: FornecedorCnpjLookup): void {
    this.fornecedorForm.razaoSocial = data.razaoSocial?.trim() || this.fornecedorForm.razaoSocial;
    this.fornecedorForm.nomeFantasia = data.nomeFantasia?.trim() || this.fornecedorForm.nomeFantasia;
    this.fornecedorForm.telefoneContato = data.telefoneContato?.trim() || this.fornecedorForm.telefoneContato;
    this.fornecedorForm.email = data.email?.trim() || this.fornecedorForm.email;
    this.fornecedorForm.endereco = data.endereco?.trim() || this.fornecedorForm.endereco;
    this.fornecedorForm.cidade = data.cidade?.trim() || this.fornecedorForm.cidade;
    this.fornecedorForm.estado = data.estado?.trim().toUpperCase() || this.fornecedorForm.estado;
  }

  private getFornecedorDisplayName(fornecedor: Fornecedor): string {
    return fornecedor.nomeFantasia || fornecedor.razaoSocial;
  }

  private formatCnpj(value: string): string {
    const digits = this.onlyDigits(value).slice(0, 14);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }

    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  private onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  private loadContrato(id: string): void {
    this.loading = true;
    this.contratoService.getById(id).subscribe({
      next: (contrato) => {
        this.loading = false;
        this.applyContratoToForm(contrato);
        this.pageTitleService.setPageTitle(`Editar contrato ${contrato.numero}`);
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        if (error.status === 404) {
          this.toastr.error('Contrato nao encontrado.');
          this.router.navigate(['/contratos']);
          return;
        }

        this.toastr.error('Não foi possível carregar o contrato.');
        this.router.navigate(['/contratos']);
      },
    });
  }

  private applyContratoToForm(contrato: Contrato): void {
    this.form = {
      fornecedorId: contrato.fornecedorId,
      unidadeDemandanteId: contrato.unidadeDemandanteId || '',
      numero: contrato.numero,
      idSei: contrato.idSei,
      prepostoNome: contrato.prepostoNome || '',
      prepostoNumeroContato: contrato.prepostoNumeroContato || '',
      obs: contrato.obs || '',
      processo: contrato.processo,
      objeto: contrato.objeto,
      observacoesComplementares: contrato.observacoesComplementares || '',
      dataInicio: contrato.dataInicio?.slice(0, 10) || '',
      lei: contrato.lei,
      vigenciaInicial: contrato.vigenciaInicial?.slice(0, 10) || '',
      vigenciaMaxima: contrato.vigenciaMaxima?.slice(0, 10) || '',
      responsavelGconv: contrato.responsavelGconv,
      valorInicialContratual: Number(contrato.valorInicialContratual || 0),
      procuradores: contrato.procuradores?.length
        ? contrato.procuradores.map((item) => ({
            nome: item.nome,
            numeroContato: item.numeroContato,
            email: item.email,
          }))
        : [],
    };
  }

  private createEmptyProcurador(): ContratoProcuradorPayload {
    return {
      nome: '',
      numeroContato: '',
      email: '',
    };
  }
}
