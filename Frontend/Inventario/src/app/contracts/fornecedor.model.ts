export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email?: string | null;
  telefoneContato: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface FornecedorPayload {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email?: string | null;
  telefoneContato: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface FornecedorCnpjLookup {
  cnpj: string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  telefoneContato?: string | null;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
}
