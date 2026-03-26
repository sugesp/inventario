export interface Portaria {
  id: string;
  contratoId: string;
  numeroPortaria: string;
  idSei: string;
  descricao?: string | null;
  dataPublicacao: string;
}

export interface PortariaPayload {
  contratoId: string;
  numeroPortaria: string;
  idSei: string;
  descricao?: string | null;
  dataPublicacao: string;
}
