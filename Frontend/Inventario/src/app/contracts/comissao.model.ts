export interface ComissaoMembro {
  usuarioId: string;
  nome: string;
  cpf: string;
  equipeId?: string | null;
  equipeDescricao?: string | null;
}

export interface ComissaoMembroPayload {
  usuarioId: string;
  equipeId?: string | null;
}

export interface Comissao {
  id: string;
  ano: number;
  status: 'Ativa' | 'Inativa';
  presidenteId: string;
  presidenteNome: string;
  membros: ComissaoMembro[];
}

export interface ComissaoPayload {
  ano: number;
  status: 'Ativa' | 'Inativa';
  presidenteId: string;
  membros: ComissaoMembroPayload[];
}
