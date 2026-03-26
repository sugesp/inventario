export enum FuncaoEquipeContrato {
  Fiscal = 1,
  Gestor = 2,
}

export interface EquipeContrato {
  id: string;
  contratoId: string;
  usuarioId: string;
  usuarioNome?: string | null;
  usuarioCpf?: string | null;
  portariaId?: string | null;
  portariaNumero?: string | null;
  funcao: FuncaoEquipeContrato;
  ehSubstituto: boolean;
  dataInclusao: string;
  dataExclusao?: string | null;
  motivoExclusao?: string | null;
}

export interface EquipeContratoPayload {
  contratoId: string;
  usuarioId: string;
  portariaId?: string | null;
  funcao: FuncaoEquipeContrato;
  ehSubstituto: boolean;
  dataInclusao?: string | null;
  dataExclusao?: string | null;
  motivoExclusao?: string | null;
}
