export interface Local {
  id: string;
  nome: string;
  comissaoId: string;
  comissaoAno: number;
  membros: LocalMembro[];
}

export interface LocalMembro {
  usuarioId: string;
  nome: string;
  cpf: string;
}

export interface LocalPayload {
  nome: string;
  comissaoId: string;
  membroUsuarioIds: string[];
}
