export interface ItemInventarioFoto {
  id: string;
  nomeOriginal: string;
  url: string;
  caminhoRelativo: string;
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
  observacao: string;
  dataInventario: string;
  latitude?: number | null;
  longitude?: number | null;
  precisaoLocalizacao?: number | null;
  lancadoEEstado: boolean;
  lancadoEEstadoPorUsuarioId?: string | null;
  lancadoEEstadoPorUsuarioNome?: string | null;
  lancadoEEstadoEm?: string | null;
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
  statusItem: string;
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
  lancadoEEstado: boolean;
  dataInventario: string;
}
