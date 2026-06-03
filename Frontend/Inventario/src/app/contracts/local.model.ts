export interface Local {
  id: string;
  nome: string;
  comissaoId: string;
  comissaoAno: number;
  latitude?: number | null;
  longitude?: number | null;
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
  latitude?: number | null;
  longitude?: number | null;
  membroUsuarioIds: string[];
}
