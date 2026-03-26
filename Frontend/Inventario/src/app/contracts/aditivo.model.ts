export enum TipoAditivo {
  Renovacao = 1,
  Acrescimo = 2,
  Supressao = 3,
  Apostilamento = 4,
}

export interface Aditivo {
  id: string;
  contratoId: string;
  numero: string;
  idSei: string;
  tipo: TipoAditivo;
  observacao?: string | null;
  dataInicio: string;
  novaVigencia?: string | null;
  valor: number;
}

export interface AditivoPayload {
  contratoId: string;
  numero: string;
  idSei: string;
  tipo: TipoAditivo;
  observacao?: string | null;
  dataInicio: string;
  novaVigencia?: string | null;
  valor: number;
}
