export const USER_PERMISSIONS = ['Administrador', 'Inventario', 'Levantamento', 'GTI.Tecnico', 'GTI.Gestor', 'Acesso.Sigiloso'] as const;

export type UserPermission = typeof USER_PERMISSIONS[number];

export interface UserPermissionOption {
  value: UserPermission;
  label: string;
  description: string;
}

export const USER_PERMISSION_OPTIONS: UserPermissionOption[] = [
  {
    value: 'Administrador',
    label: 'Administrador',
    description: 'Gerencia usuários, comissões, locais e unidades administrativas.',
  },
  {
    value: 'Inventario',
    label: 'Inventário',
    description: 'Acessa o módulo de inventário; membros de comissão podem inventariar e presidentes editam sua comissão.',
  },
  {
    value: 'Levantamento',
    label: 'Levantamento',
    description: 'Cria levantamentos, confirma tombamentos e consulta a listagem de levantamentos.',
  },
  {
    value: 'GTI.Tecnico',
    label: 'GTI - Técnico',
    description: 'Cria laudos técnicos.',
  },
  {
    value: 'GTI.Gestor',
    label: 'GTI - Gestor',
    description: 'Verifica laudos e efetua transferências.',
  },
  {
    value: 'Acesso.Sigiloso',
    label: 'Acesso sigiloso',
    description: 'Autoriza acesso a dados marcados como sigilosos quando o backend exigir esse perfil.',
  },
];

export const PERMISSION_GROUPS = {
  administracao: ['Administrador'],
  cadastroGestao: ['Administrador', 'Inventario'],
  gestorUnidade: ['Administrador', 'GTI.Gestor'],
  solicitante: ['Administrador', 'Inventario', 'Levantamento'],
  operador: ['Administrador', 'Inventario', 'Levantamento', 'GTI.Tecnico'],
  revisorAprovador: ['Administrador', 'GTI.Gestor'],
  motoristaExecutor: ['Administrador', 'GTI.Gestor'],
  acessoSigiloso: ['Administrador', 'Acesso.Sigiloso'],
} satisfies Record<string, readonly UserPermission[]>;

export function getUserPermissionLabel(permission: string): string {
  return USER_PERMISSION_OPTIONS.find((item) => item.value === permission)?.label ?? permission;
}
