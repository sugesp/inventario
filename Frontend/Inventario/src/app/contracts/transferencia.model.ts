export interface TransferenciaItem {
  id: string;
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  statusItem: string;
  condicao: string;
  observacao: string;
}

export interface Transferencia {
  id: string;
  localDestinoId: string;
  localDestinoNome: string;
  criadoPorUsuarioId: string;
  criadoPorUsuarioNome: string;
  finalizadoPorUsuarioId?: string | null;
  finalizadoPorUsuarioNome?: string | null;
  responsavelDestino: string;
  idSeiTermo: string;
  dataEntrega?: string | null;
  status: string;
  observacao: string;
  createdAt: string;
  updatedAt?: string | null;
  itens: TransferenciaItem[];
}

export interface TransferenciaItemPayload {
  tombamentoNovo: string;
  tombamentoAntigo: string;
  descricao: string;
  statusItem: string;
  condicao: string;
  observacao: string;
}

export interface TransferenciaPayload {
  localDestinoId: string;
  responsavelDestino: string;
  idSeiTermo: string;
  dataEntrega?: string | null;
  status: string;
  observacao: string;
  itens: TransferenciaItemPayload[];
}
