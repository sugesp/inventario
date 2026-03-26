export interface GlosaNotaFiscal {
  id: string;
  notaFiscalId: string;
  idSei: string;
  valorGlosa: number;
  dataGlosa: string;
  descricao?: string | null;
}

export interface GlosaNotaFiscalPayload {
  notaFiscalId: string;
  idSei: string;
  valorGlosa: number;
  dataGlosa: string;
  descricao?: string | null;
}
