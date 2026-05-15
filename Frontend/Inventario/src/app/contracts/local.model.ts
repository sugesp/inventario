export interface Local {
  id: string;
  nome: string;
  equipeId: string;
  equipeDescricao: string;
  comissaoId: string;
  comissaoAno: number;
}

export interface LocalPayload {
  nome: string;
  equipeId: string;
}
