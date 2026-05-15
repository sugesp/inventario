export interface Equipe {
  id: string;
  descricao: string;
  comissaoId?: string | null;
  comissaoAno: number;
}

export interface EquipePayload {
  descricao: string;
  comissaoId: string;
}
