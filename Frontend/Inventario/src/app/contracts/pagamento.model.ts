export interface Pagamento {
  id: string;
  liquidacaoId: string;
  notaFiscalId: string;
  exercicioAnualId: string;
  contratoId: string;
  exercicioAno: number;
  numeroLiquidacao: string;
  numeroNotaFiscal: string;
  numeroOrdemBancaria: string;
  idSeiOrdemBancaria: string;
  valorOrdemBancaria: number;
  dataOrdemBancaria: string;
  numeroPreparacaoPagamento: string;
  idSeiPreparacaoPagamento: string;
  valorPreparacaoPagamento: number;
  dataPreparacaoPagamento?: string | null;
}

export interface PagamentoPayload {
  liquidacaoId: string;
  numeroOrdemBancaria: string;
  idSeiOrdemBancaria: string;
  valorOrdemBancaria: number;
  dataOrdemBancaria: string;
  numeroPreparacaoPagamento: string;
  idSeiPreparacaoPagamento: string;
  valorPreparacaoPagamento: number;
  dataPreparacaoPagamento?: string | null;
}
