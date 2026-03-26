export interface NotaFiscal {
  id: string;
  processoPagamentoId: string;
  exercicioAnualId: string;
  contratoId: string;
  exercicioAno: number;
  processoPagamentoNumero: string;
  numero: string;
  serie: string;
  referencia: string;
  idSei: string;
  dataEmissao: string;
  valor: number;
  baseCalculo: number;
  inss: number;
  iss: number;
  irrf: number;
}

export interface NotaFiscalPayload {
  processoPagamentoId: string;
  numero: string;
  serie: string;
  referencia: string;
  idSei: string;
  dataEmissao: string;
  valor: number;
  baseCalculo: number;
  inss: number;
  iss: number;
  irrf: number;
}
