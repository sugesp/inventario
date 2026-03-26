export interface RestoPagar {
  id: string;
  empenhoId: string;
  exercicioAnualId: string;
  contratoId: string;
  exercicioAno: number;
  numeroEmpenho: string;
  numeroNotaLancamento: string;
  idSei: string;
  data: string;
  valor: number;
}

export interface RestoPagarPayload {
  empenhoId: string;
  numeroNotaLancamento: string;
  idSei: string;
  data: string;
  valor: number;
}
