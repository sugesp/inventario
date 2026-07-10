export interface LaudoTecnico {
  id: string;
  processoSei: string;
  idDevolucaoSei: string;
  unidadeGestora: string;
  setor: string;
  dataAvaliacao?: string | null;
  tipoEquipamento: string;
  outroTipoEquipamento: string;
  patrimonio: string;
  tombamentoAntigo: string;
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
  possuiReparo?: boolean | null;
  descricaoReparo: string;
  valorEstimadoMercado?: number | null;
  custoEstimadoManutencao?: number | null;
  percentualEstimado?: number | null;
  classificacaoTecnica: string;
  justificativaTecnica: string;
  recomendacoes: string[];
  sugestoesDestinacao: string[];
  registroFotografico: string[];
  quantidadeFotos?: number | null;
  conclusaoCondicao: string;
  classificacaoFinal: string;
  responsavelTecnicoUsuarioId: string;
  responsavelTecnicoNome: string;
  responsavelTecnicoCargo: string;
  createdAt: string;
  updatedAt?: string | null;
  fotos: LaudoTecnicoFoto[];
}

export interface LaudoTecnicoFoto {
  id: string;
  categoria: string;
  nomeOriginal: string;
  url: string;
}

export interface LaudoTecnicoPayload {
  processoSei: string;
  idDevolucaoSei: string;
  unidadeGestora: string;
  setor: string;
  dataAvaliacao?: string | null;
  tipoEquipamento: string;
  outroTipoEquipamento: string;
  patrimonio: string;
  tombamentoAntigo: string;
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
  possuiReparo?: boolean | null;
  descricaoReparo: string;
  valorEstimadoMercado?: number | null;
  custoEstimadoManutencao?: number | null;
  percentualEstimado?: number | null;
  classificacaoTecnica: string;
  justificativaTecnica: string;
  recomendacoes: string[];
  sugestoesDestinacao: string[];
  registroFotografico: string[];
  quantidadeFotos?: number | null;
  conclusaoCondicao: string;
  classificacaoFinal: string;
}

export interface LaudoTecnicoIdentificacaoPayload {
  processoSei: string;
  idDevolucaoSei: string;
  unidadeGestora: string;
  setor: string;
  dataAvaliacao?: string | null;
}
