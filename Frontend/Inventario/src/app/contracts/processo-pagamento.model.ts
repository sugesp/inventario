export interface ProcessoPagamento {
  id: string;
  exercicioAnualId: string;
  contratoId: string;
  exercicioAno: number;
  numeroProcesso: string;
  observacoes?: string | null;
}

export interface ProcessoPagamentoPayload {
  exercicioAnualId: string;
  numeroProcesso: string;
  observacoes?: string | null;
}
