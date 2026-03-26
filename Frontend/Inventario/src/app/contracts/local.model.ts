export interface Local {
  id: string;
  nome: string;
  equipeId: string;
  equipeDescricao: string;
}

export interface LocalPayload {
  nome: string;
  equipeId: string;
}
