export interface Notificacao {
  id: string;
  contratoId: string;
  titulo: string;
  descricao?: string | null;
  idSei: string;
  dataNotificacao: string;
  idSeiResposta?: string | null;
  dataResposta?: string | null;
  pendenteResposta: boolean;
}

export interface NotificacaoPayload {
  contratoId: string;
  titulo: string;
  descricao?: string | null;
  idSei: string;
  dataNotificacao: string;
  idSeiResposta?: string | null;
  dataResposta?: string | null;
}
