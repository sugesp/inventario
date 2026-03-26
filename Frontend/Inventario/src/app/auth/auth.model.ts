export interface LoginPayload {
  cpf: string;
  senha: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  cpf: string;
  perfil: 'Administrador' | 'Contratos' | 'Financeiro' | 'Controle Interno' | 'Operador';
  status: 'Ativo' | 'Pendente' | 'Desativado';
  equipeId?: string | null;
}

export interface PreRegisterPayload {
  nome: string;
  email: string;
  cpf: string;
  senha: string;
}

export interface ChangePasswordPayload {
  senhaAtual?: string;
  novaSenha: string;
}

export interface UserSummary {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  perfil: string;
  status: string;
  equipeId?: string | null;
  equipeDescricao?: string | null;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  nome: string;
  email: string;
  cpf: string;
  perfil: string;
  status: string;
  equipeId?: string | null;
  equipeDescricao?: string | null;
  mustChangePassword: boolean;
}

export interface AuthSession extends AuthResponse {}
