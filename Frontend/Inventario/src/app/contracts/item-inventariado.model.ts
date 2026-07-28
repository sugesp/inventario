export interface ItemInventarioFoto {
  id: string;
  nomeOriginal: string;
  url: string;
  caminhoRelativo: string;
}

export interface ItemInventariadoMovimentacaoLocal {
  id: string;
  itemInventariadoId: string;
  comissaoId?: string | null;
  comissaoAno?: number | null;
  tombamento: string;
  descricao: string;
  localOrigemId: string;
  localOrigemNome: string;
  localDestinoId: string;
  localDestinoNome: string;
  movidoPorUsuarioId: string;
  movidoPorUsuarioNome: string;
  justificativa: string;
  movidoEm: string;
}

export interface ItemInventariado {
  id: string;
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  localId: string;
  localNome: string;
  localMembrosNomes: string[];
  localLatitude?: number | null;
  localLongitude?: number | null;
  usuarioId: string;
  usuarioNome: string;
  comissaoId?: string | null;
  comissaoAno?: number | null;
  comissaoStatus?: string | null;
  status: string;
  estadoConservacao: string;
  justificativaInservivel: string;
  observacao: string;
  isVeiculo: boolean;
  placa: string;
  chassi: string;
  placaSeguranca: string;
  marca: string;
  modelo: string;
  odometro?: number | null;
  dataInventario: string;
  latitude?: number | null;
  longitude?: number | null;
  precisaoLocalizacao?: number | null;
  lancadoEEstado: boolean;
  lancadoEEstadoPorUsuarioId?: string | null;
  lancadoEEstadoPorUsuarioNome?: string | null;
  lancadoEEstadoEm?: string | null;
  motivoUltimaReversaoEEstado: string;
  revertidoEEstadoPorUsuarioId?: string | null;
  revertidoEEstadoPorUsuarioNome?: string | null;
  revertidoEEstadoEm?: string | null;
  motivoExclusao: string;
  excluidoPorUsuarioId?: string | null;
  excluidoPorUsuarioNome?: string | null;
  excluidoEm?: string | null;
  fotos: ItemInventarioFoto[];
}

export interface InconsistenciaInventario {
  tombamento: string;
  descricao: string;
  comissaoId?: string | null;
  comissaoAno?: number | null;
  quantidadeOcorrencias: number;
  quantidadeLocais: number;
  ocorrencias: InconsistenciaInventarioOcorrencia[];
}

export interface InconsistenciaInventarioOcorrencia {
  itemInventariadoId: string;
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  localId: string;
  localNome: string;
  localMembrosNomes: string[];
  usuarioId: string;
  usuarioNome: string;
  status: string;
  estadoConservacao: string;
  dataInventario: string;
  observacao: string;
}

export interface ConsultaPublicaBem {
  tombamento: string;
  tombamentoAntigo: string;
  tipo: string;
  descricao: string;
  urlConsulta: string;
}

export interface ConsultaTombamento {
  tombamentoPesquisado: string;
  consultaPublica?: ConsultaPublicaBem | null;
  ocorrencias: ConsultaTombamentoOcorrencias;
}

export interface ConsultaTombamentoOcorrencias {
  transferencias: ConsultaTombamentoTransferencia[];
  itensLevantamento: ConsultaTombamentoLevantamentoItem[];
  laudos: ConsultaTombamentoLaudo[];
  itensInventariados: ConsultaTombamentoItemInventariado[];
}

export interface ConsultaTombamentoTransferencia {
  transferenciaId: string;
  itemId: string;
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  statusTransferencia: string;
  situacaoTransferencia: string;
  condicao: string;
  unidadeAdministrativaDestinoNome: string;
  unidadeAdministrativaDestinoSigla: string;
  responsavelDestino: string;
  idSeiTermo: string;
  dataEntrega?: string | null;
  createdAt: string;
}

export interface ConsultaTombamentoLevantamentoItem {
  levantamentoId: string;
  itemId: string;
  levantamentoNome: string;
  tombamento: string;
  tombamentoAntigo: string;
  descricao: string;
  tipo: string;
  confirmadoPorUsuarioNome: string;
  createdAt: string;
}

export interface ConsultaTombamentoLaudo {
  id: string;
  patrimonio: string;
  processoSei: string;
  idDevolucaoSei: string;
  tipoEquipamento: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  classificacaoFinal: string;
  responsavelTecnicoNome: string;
  dataAvaliacao?: string | null;
  createdAt: string;
}

export interface ConsultaTombamentoItemInventariado {
  id: string;
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  localNome: string;
  localMembrosNomes: string;
  usuarioNome: string;
  status: string;
  estadoConservacao: string;
  justificativaInservivel: string;
  lancadoEEstado: boolean;
  dataInventario: string;
}
