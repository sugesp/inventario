export const USER_PERMISSIONS = ['Administrador', 'Inventario', 'PainelTV', 'Levantamento', 'ControleInterno', 'GTI.Tecnico', 'GTI.Gestor'] as const;

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
    value: 'PainelTV',
    label: 'Painel da Comissão (TV)',
    description: 'Acessa exclusivamente o painel de acompanhamento da comissão de inventário.',
  },
  {
    value: 'Levantamento',
    label: 'Levantamento',
    description: 'Cria levantamentos, confirma tombamentos e consulta a listagem de levantamentos.',
  },
  {
    value: 'ControleInterno',
    label: 'Controle Interno',
    description: 'Consulta comissões, itens inventariados e consulta por tombamento sem ações de edição.',
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
];

export const PERMISSION_GROUPS = {
  administracao: ['Administrador'],
  cadastroGestao: ['Administrador', 'Inventario'],
  consultaInventario: ['Administrador', 'Inventario', 'PainelTV', 'ControleInterno'],
  gestorUnidade: ['Administrador', 'GTI.Gestor'],
  solicitante: ['Administrador', 'Inventario', 'Levantamento'],
  operador: ['Administrador', 'Inventario', 'Levantamento', 'GTI.Tecnico'],
  revisorAprovador: ['Administrador', 'GTI.Gestor'],
  motoristaExecutor: ['Administrador', 'GTI.Gestor'],
} satisfies Record<string, readonly UserPermission[]>;

export function getUserPermissionLabel(permission: string): string {
  return USER_PERMISSION_OPTIONS.find((item) => item.value === permission)?.label ?? permission;
}
