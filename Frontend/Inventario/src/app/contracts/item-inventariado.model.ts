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
  equipeId: string;
  equipeDescricao: string;
  usuarioId: string;
  usuarioNome: string;
  comissaoId?: string | null;
  comissaoAno?: number | null;
  comissaoStatus?: string | null;
  status: string;
  estadoConservacao: string;
  observacao: string;
  dataInventario: string;
  lancadoEEstado: boolean;
  lancadoEEstadoPorUsuarioId?: string | null;
  lancadoEEstadoPorUsuarioNome?: string | null;
  lancadoEEstadoEm?: string | null;
  fotos: ItemInventarioFoto[];
}

export interface ConsultaPublicaBem {
  tombamento: string;
  tombamentoAntigo: string;
  tipo: string;
  descricao: string;
  urlConsulta: string;
}
