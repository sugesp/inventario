export interface ComissaoMembro {
  usuarioId: string;
  nome: string;
  cpf: string;
}

export interface ComissaoMembroPayload {
  usuarioId: string;
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
