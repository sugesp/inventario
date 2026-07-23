export interface Local {
  id: string;
  nome: string;
  comissaoId: string;
  comissaoAno: number;
  localSuperiorId?: string | null;
  localSuperiorNome?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bloqueado: boolean;
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
  localSuperiorId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  membroUsuarioIds: string[];
}
