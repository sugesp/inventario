import { Component, DoCheck, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth/auth.service';
import { LaudoTecnico, LaudoTecnicoPayload } from '../../contracts/laudo-tecnico.model';
import { LaudoTecnicoService } from '../../contracts/laudo-tecnico.service';

type LaudoStep = 'identificacao' | 'equipamento' | 'avaliacao' | 'viabilidade' | 'recomendacao' | 'conclusao';

interface LaudoForm {
  processoSei: string;
  idDevolucaoSei: string;
  unidadeGestora: string;
  setor: string;
  dataAvaliacao: string;
  tipoEquipamento: string;
  outroTipoEquipamento: string;
  patrimonio: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  anoAquisicao: string;
  processador: string;
  memoria: string;
  armazenamento: string;
  sistemaOperacional: string;
  outros: string;
  condicaoFuncionamento: string;
  descricaoFuncionamento: string;
  estadoConservacao: string;
  problemasIdentificados: string[];
  outroProblema: string;
  descricaoTecnicaDetalhada: string;
  possuiReparo: 'SIM' | 'NAO' | '';
  descricaoReparo: string;
  valorEstimadoMercado: string;
  custoEstimadoManutencao: string;
  percentualEstimado: string;
  classificacaoTecnica: string;
  justificativaTecnica: string;
  recomendacoes: string[];
  sugestoesDestinacao: string[];
  registroFotografico: string[];
  quantidadeFotos: string;
  conclusaoCondicao: string;
  classificacaoFinal: string;
}

interface PersistedLaudoState {
  currentStep: LaudoStep;
  form: LaudoForm;
}

@Component({
  selector: 'app-laudo-tecnico',
  templateUrl: './laudo-tecnico.component.html',
  styleUrl: './laudo-tecnico.component.scss',
})
export class LaudoTecnicoComponent implements OnInit, DoCheck {
  private static readonly STORAGE_KEY = 'inventario.laudo-tecnico.state';

  readonly steps: Array<{ key: LaudoStep; label: string; hint: string }> = [
    { key: 'identificacao', label: 'Identificação', hint: 'Processo e origem' },
    { key: 'equipamento', label: 'Equipamento', hint: 'Bem avaliado' },
    { key: 'avaliacao', label: 'Avaliação', hint: 'Estado técnico' },
    { key: 'viabilidade', label: 'Viabilidade', hint: 'Reparo e estimativa' },
    { key: 'recomendacao', label: 'Recomendação', hint: 'Encaminhamento' },
    { key: 'conclusao', label: 'Conclusão', hint: 'Fechamento' },
  ];

  readonly equipmentTypes = ['Computador', 'Notebook', 'Monitor', 'Impressora', 'Scanner', 'Nobreak', 'Outro'];
  readonly funcionamentoOptions = ['Funcionando normalmente', 'Funcionando parcialmente', 'Nao funciona'];
  readonly conservacaoOptions = ['Excelente', 'Bom', 'Regular', 'Pessimo'];
  readonly problemasOptions = [
    'Obsolescencia tecnologica',
    'Desgaste por tempo de uso',
    'Falha de hardware',
    'Falha de software',
    'Danos fisicos',
    'Pecas indisponiveis',
    'Outro',
  ];
  readonly classificacaoOptions = ['Ocioso', 'Recuperavel', 'Antieconomico', 'Irrecuperavel'];
  readonly recomendacaoOptions = ['Manutencao', 'Reaproveitamento interno', 'Encaminhar para desfazimento'];
  readonly destinacaoOptions = ['Doacao', 'Leilao', 'Descarte', 'Inutilizacao'];
  readonly registroFotograficoOptions = ['Equipamento completo', 'Etiqueta patrimonial', 'Defeitos identificados'];
  readonly conclusaoOptions = ['Servivel', 'Inservivel'];

  currentStep: LaudoStep = 'identificacao';
  saving = false;
  savedLaudo: LaudoTecnico | null = null;
  private lastPersistedSnapshot = '';

  form: LaudoForm = this.createEmptyForm();

  constructor(
    readonly authService: AuthService,
    private readonly laudoTecnicoService: LaudoTecnicoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.restoreState();
  }

  ngDoCheck(): void {
    const snapshot = JSON.stringify({
      currentStep: this.currentStep,
      form: this.form,
    });

    if (snapshot === this.lastPersistedSnapshot) {
      return;
    }

    this.lastPersistedSnapshot = snapshot;
    this.persistState();
  }

  get currentStepIndex(): number {
    return this.steps.findIndex((item) => item.key === this.currentStep);
  }

  get progressPercentage(): number {
    return ((this.currentStepIndex + 1) / this.steps.length) * 100;
  }

  get responsavelTecnicoNome(): string {
    return this.authService.session?.nome?.trim() || 'Usuario autenticado';
  }

  get responsavelTecnicoCargo(): string {
    return this.authService.session?.perfil?.trim() || 'Usuario';
  }

  get canGoBack(): boolean {
    return this.currentStepIndex > 0;
  }

  get canGoNext(): boolean {
    return this.currentStepIndex < this.steps.length - 1;
  }

  get canSubmit(): boolean {
    return this.isStepValid('identificacao')
      && this.isStepValid('equipamento')
      && this.isStepValid('avaliacao')
      && this.isStepValid('viabilidade')
      && this.isStepValid('recomendacao')
      && this.isStepValid('conclusao');
  }

  get canShowOutroTipo(): boolean {
    return this.form.tipoEquipamento === 'Outro';
  }

  get canShowOutroProblema(): boolean {
    return this.form.problemasIdentificados.includes('Outro');
  }

  get canShowSugestaoDestinacao(): boolean {
    return this.form.recomendacoes.includes('Encaminhar para desfazimento');
  }

  setStep(step: LaudoStep): void {
    this.currentStep = step;
  }

  goToPreviousStep(): void {
    if (!this.canGoBack) {
      return;
    }

    this.currentStep = this.steps[this.currentStepIndex - 1].key;
  }

  goToNextStep(): void {
    if (!this.canGoNext) {
      return;
    }

    if (!this.isStepValid(this.currentStep)) {
      this.toastr.warning(this.getStepValidationMessage(this.currentStep));
      return;
    }

    this.currentStep = this.steps[this.currentStepIndex + 1].key;
  }

  isStepActive(step: LaudoStep): boolean {
    return this.currentStep === step;
  }

  isOptionSelected(values: string[], option: string): boolean {
    return values.includes(option);
  }

  toggleMultiSelect(field: 'problemasIdentificados' | 'recomendacoes' | 'sugestoesDestinacao' | 'registroFotografico', option: string, checked: boolean): void {
    const current = [...this.form[field]];
    const next = checked
      ? [...current, option]
      : current.filter((item) => item !== option);

    this.form = {
      ...this.form,
      [field]: next,
    };

    if (field === 'problemasIdentificados' && !next.includes('Outro')) {
      this.form.outroProblema = '';
    }

    if (field === 'recomendacoes' && !next.includes('Encaminhar para desfazimento')) {
      this.form.sugestoesDestinacao = [];
    }
  }

  submit(): void {
    if (!this.canSubmit) {
      this.toastr.warning('Revise os campos obrigatorios antes de salvar o laudo.');
      return;
    }

    this.saving = true;
    this.laudoTecnicoService.create(this.buildPayload()).subscribe({
      next: (laudo) => {
        this.saving = false;
        this.savedLaudo = laudo;
        this.toastr.success('Laudo tecnico salvo com sucesso.');
        this.form = this.createEmptyForm();
        this.currentStep = 'identificacao';
        this.syncSnapshotWithoutPersist();
        this.clearStateStorage();
      },
      error: (error) => {
        this.saving = false;
        this.toastr.error(error?.error?.message ?? 'Nao foi possivel salvar o laudo tecnico.');
      },
    });
  }

  resetDraft(): void {
    this.savedLaudo = null;
    this.form = this.createEmptyForm();
    this.currentStep = 'identificacao';
    this.syncSnapshotWithoutPersist();
    this.clearStateStorage();
  }

  private buildPayload(): LaudoTecnicoPayload {
    return {
      processoSei: this.form.processoSei.trim(),
      idDevolucaoSei: this.form.idDevolucaoSei.trim(),
      unidadeGestora: this.form.unidadeGestora.trim(),
      setor: this.form.setor.trim(),
      dataAvaliacao: this.form.dataAvaliacao || null,
      tipoEquipamento: this.form.tipoEquipamento,
      outroTipoEquipamento: this.form.outroTipoEquipamento.trim(),
      patrimonio: this.form.patrimonio.trim(),
      numeroSerie: this.form.numeroSerie.trim(),
      marca: this.form.marca.trim(),
      modelo: this.form.modelo.trim(),
      anoAquisicao: this.form.anoAquisicao.trim(),
      processador: this.form.processador.trim(),
      memoria: this.form.memoria.trim(),
      armazenamento: this.form.armazenamento.trim(),
      sistemaOperacional: this.form.sistemaOperacional.trim(),
      outros: this.form.outros.trim(),
      condicaoFuncionamento: this.form.condicaoFuncionamento,
      descricaoFuncionamento: this.form.descricaoFuncionamento.trim(),
      estadoConservacao: this.form.estadoConservacao,
      problemasIdentificados: this.form.problemasIdentificados,
      outroProblema: this.form.outroProblema.trim(),
      descricaoTecnicaDetalhada: this.form.descricaoTecnicaDetalhada.trim(),
      possuiReparo: this.form.possuiReparo === '' ? null : this.form.possuiReparo === 'SIM',
      descricaoReparo: this.form.descricaoReparo.trim(),
      valorEstimadoMercado: this.parseOptionalNumber(this.form.valorEstimadoMercado),
      custoEstimadoManutencao: this.parseOptionalNumber(this.form.custoEstimadoManutencao),
      percentualEstimado: this.parseOptionalNumber(this.form.percentualEstimado),
      classificacaoTecnica: this.form.classificacaoTecnica,
      justificativaTecnica: this.form.justificativaTecnica.trim(),
      recomendacoes: this.form.recomendacoes,
      sugestoesDestinacao: this.form.sugestoesDestinacao,
      registroFotografico: this.form.registroFotografico,
      quantidadeFotos: this.parseOptionalInteger(this.form.quantidadeFotos),
      conclusaoCondicao: this.form.conclusaoCondicao,
      classificacaoFinal: this.form.classificacaoFinal.trim(),
    };
  }

  private parseOptionalNumber(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const normalized = Number(value.replace(',', '.'));
    return Number.isFinite(normalized) ? normalized : null;
  }

  private parseOptionalInteger(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const normalized = Number.parseInt(value, 10);
    return Number.isFinite(normalized) ? normalized : null;
  }

  private isStepValid(step: LaudoStep): boolean {
    switch (step) {
      case 'identificacao':
        return !!this.form.dataAvaliacao;
      case 'equipamento':
        return !!this.form.tipoEquipamento
          && (!this.canShowOutroTipo || !!this.form.outroTipoEquipamento.trim())
          && !!(
            this.form.patrimonio.trim()
            || this.form.numeroSerie.trim()
            || this.form.marca.trim()
            || this.form.modelo.trim()
          );
      case 'avaliacao':
        return !!this.form.condicaoFuncionamento
          && !!this.form.estadoConservacao
          && !!this.form.descricaoTecnicaDetalhada.trim();
      case 'viabilidade':
        return this.form.possuiReparo !== '';
      case 'recomendacao':
        return !!this.form.classificacaoTecnica && !!this.form.justificativaTecnica.trim();
      case 'conclusao':
        return !!this.form.conclusaoCondicao;
      default:
        return false;
    }
  }

  private getStepValidationMessage(step: LaudoStep): string {
    switch (step) {
      case 'identificacao':
        return 'Informe ao menos a data da avaliacao para continuar.';
      case 'equipamento':
        return 'Selecione o tipo do equipamento e preencha algum identificador do bem.';
      case 'avaliacao':
        return 'Preencha a avaliacao tecnica principal antes de avancar.';
      case 'viabilidade':
        return 'Indique se existe possibilidade de reparo.';
      case 'recomendacao':
        return 'Defina a classificacao tecnica e a justificativa do laudo.';
      case 'conclusao':
        return 'Selecione a conclusao do laudo.';
      default:
        return 'Revise os campos obrigatorios.';
    }
  }

  private createEmptyForm(): LaudoForm {
    return {
      processoSei: '',
      idDevolucaoSei: '',
      unidadeGestora: '',
      setor: '',
      dataAvaliacao: this.getTodayDate(),
      tipoEquipamento: '',
      outroTipoEquipamento: '',
      patrimonio: '',
      numeroSerie: '',
      marca: '',
      modelo: '',
      anoAquisicao: '',
      processador: '',
      memoria: '',
      armazenamento: '',
      sistemaOperacional: '',
      outros: '',
      condicaoFuncionamento: '',
      descricaoFuncionamento: '',
      estadoConservacao: '',
      problemasIdentificados: [],
      outroProblema: '',
      descricaoTecnicaDetalhada: '',
      possuiReparo: '',
      descricaoReparo: '',
      valorEstimadoMercado: '',
      custoEstimadoManutencao: '',
      percentualEstimado: '',
      classificacaoTecnica: '',
      justificativaTecnica: '',
      recomendacoes: [],
      sugestoesDestinacao: [],
      registroFotografico: [],
      quantidadeFotos: '',
      conclusaoCondicao: '',
      classificacaoFinal: '',
    };
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private persistState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const state: PersistedLaudoState = {
      currentStep: this.currentStep,
      form: this.form,
    };

    window.sessionStorage.setItem(LaudoTecnicoComponent.STORAGE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    if (typeof window === 'undefined') {
      this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
      return;
    }

    const raw = window.sessionStorage.getItem(LaudoTecnicoComponent.STORAGE_KEY);
    if (!raw) {
      this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
      return;
    }

    try {
      const state = JSON.parse(raw) as PersistedLaudoState;
      this.currentStep = state.currentStep ?? 'identificacao';
      this.form = {
        ...this.createEmptyForm(),
        ...state.form,
        problemasIdentificados: state.form?.problemasIdentificados ?? [],
        recomendacoes: state.form?.recomendacoes ?? [],
        sugestoesDestinacao: state.form?.sugestoesDestinacao ?? [],
        registroFotografico: state.form?.registroFotografico ?? [],
      };
    } catch {
      this.clearStateStorage();
    }

    this.lastPersistedSnapshot = JSON.stringify({ currentStep: this.currentStep, form: this.form });
  }

  private clearStateStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(LaudoTecnicoComponent.STORAGE_KEY);
  }

  private syncSnapshotWithoutPersist(): void {
    this.lastPersistedSnapshot = JSON.stringify({
      currentStep: this.currentStep,
      form: this.form,
    });
  }
}
