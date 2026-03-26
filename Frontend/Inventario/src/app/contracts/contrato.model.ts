export interface ContratoProcurador {
  id: string;
  nome: string;
  numeroContato: string;
  email: string;
}

export interface ContratoProcuradorPayload {
  nome: string;
  numeroContato: string;
  email: string;
}

export interface Contrato {
  id: string;
  fornecedorId: string;
  fornecedorNome?: string | null;
  fornecedorCnpj?: string | null;
  unidadeDemandanteId?: string | null;
  unidadeDemandanteSigla?: string | null;
  unidadeDemandanteNome?: string | null;
  numero: string;
  idSei: string;
  prepostoNome?: string | null;
  prepostoNumeroContato?: string | null;
  obs?: string | null;
  inadimplencia: boolean;
  quantidadeAditivos: number;
  processo: string;
  objeto: string;
  observacoesComplementares?: string | null;
  dataInicio: string;
  lei: string;
  vigenciaInicial: string;
  vigenciaAtual: string;
  vigenciaMaxima?: string | null;
  responsavelGconv: string;
  valorInicialContratual: number;
  valorAcrescimo: number;
  valorSupressao: number;
  valorAtualContrato: number;
  procuradores: ContratoProcurador[];
}

export interface ContratoPayload {
  fornecedorId: string;
  unidadeDemandanteId: string;
  numero: string;
  idSei: string;
  prepostoNome?: string | null;
  prepostoNumeroContato?: string | null;
  obs?: string | null;
  processo: string;
  objeto: string;
  observacoesComplementares?: string | null;
  dataInicio: string;
  lei: string;
  vigenciaInicial: string;
  vigenciaMaxima?: string | null;
  responsavelGconv: string;
  valorInicialContratual: number;
  procuradores: ContratoProcuradorPayload[];
}
