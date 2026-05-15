import { UserPermission } from './permissions';

export interface LoginPayload {
  cpf: string;
  senha: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  cpf: string;
  permissoes: UserPermission[];
  status: 'Ativo' | 'Pendente' | 'Desativado';
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
  permissoes: string[];
  status: string;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  userId: string;
  token: string;
  expiresAt: string;
  nome: string;
  email: string;
  cpf: string;
  permissoes: string[];
  status: string;
  mustChangePassword: boolean;
}

export interface AuthSession extends AuthResponse { }
