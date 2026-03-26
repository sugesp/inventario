export interface Empenho {
  id: string;
  exercicioAnualId: string;
  contratoId: string;
  exercicioAno: number;
  numeroEmpenho: string;
  idSei: string;
  dataEmpenho: string;
  valorEmpenhado: number;
  valorLiquidado: number;
  fonte: string;
  observacao?: string | null;
}

export interface EmpenhoPayload {
  exercicioAnualId: string;
  numeroEmpenho: string;
  idSei: string;
  dataEmpenho: string;
  valorEmpenhado: number;
  fonte: string;
  observacao?: string | null;
}
