export interface UnidadeAdministrativa {
  id: string;
  nome: string;
  sigla: string;
  unidadeSuperiorId?: string | null;
  unidadeSuperiorNome?: string | null;
}

export interface UnidadeAdministrativaPayload {
  nome: string;
  sigla: string;
  unidadeSuperiorId?: string | null;
}
