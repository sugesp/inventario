export interface LevantamentoItem {
  id: string;
  tombamento: string;
  tombamentoAntigo: string;
  descricao: string;
  tipo: string;
  urlConsulta: string;
  confirmadoPorUsuarioId: string;
  confirmadoPorUsuarioNome: string;
  createdAt: string;
}

export interface Levantamento {
  id: string;
  nome: string;
  descricao: string;
  criadoPorUsuarioId: string;
  criadoPorUsuarioNome: string;
  createdAt: string;
  updatedAt?: string | null;
  itens: LevantamentoItem[];
}

export interface LevantamentoCreatePayload {
  nome: string;
  descricao: string;
}
