export interface Unidade {
  id: string;
  nome: string;
  sigla: string;
  unidadeSuperiorId?: string | null;
  unidadeSuperiorNome?: string | null;
}

export interface UnidadePayload {
  nome: string;
  sigla: string;
  unidadeSuperiorId?: string | null;
}
