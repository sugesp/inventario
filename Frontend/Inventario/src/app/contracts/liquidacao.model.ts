export interface Liquidacao {
  id: string;
  empenhoId?: string | null;
  notaFiscalId: string;
  numeroLiquidacao: string;
  idSei: string;
  dataLiquidacao: string;
  valorLiquidado: number;
  observacao?: string | null;
}

export interface LiquidacaoPayload {
  notaFiscalId: string;
  numeroLiquidacao: string;
  idSei: string;
  dataLiquidacao: string;
  valorLiquidado: number;
  observacao?: string | null;
}
