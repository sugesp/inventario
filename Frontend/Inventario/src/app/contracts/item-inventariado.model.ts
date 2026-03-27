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
  status: string;
  observacao: string;
  dataInventario: string;
  fotos: ItemInventarioFoto[];
}

export interface ConsultaPublicaBem {
  tombamento: string;
  tombamentoAntigo: string;
  tipo: string;
  descricao: string;
  urlConsulta: string;
}
