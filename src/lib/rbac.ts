import type { UserRole, SystemArea, SystemAction, AclProfile } from './definitions';

export type Resource = SystemArea;
export type Action = SystemAction | 'manage';

export type AreaConfig = {
  label: string;
  actions: SystemAction[];
};

export const SYSTEM_AREAS: Record<SystemArea, AreaConfig> = {
  dashboard: { label: 'Painel', actions: ['read'] },
  clients: { label: 'Clientes', actions: ['read', 'create', 'update', 'delete'] },
  vehicles: { label: 'Veículos', actions: ['read', 'create', 'update', 'delete'] },
  financialRecords: { label: 'Registros Financeiros', actions: ['read', 'create', 'update', 'delete'] },
  billing: { label: 'Cobranças', actions: ['read', 'create', 'update', 'delete'] },
  reports: { label: 'Relatórios', actions: ['read', 'export'] },
  users: { label: 'Usuários', actions: ['read', 'create', 'update', 'delete'] },
  acl: { label: 'Controle de Acesso', actions: ['read', 'create', 'update', 'delete'] },
  settings: { label: 'Configurações', actions: ['read', 'update'] },
};

export function can(role: UserRole | null | undefined, resource: Resource, action: Action): boolean {
  if (!role) return false;
  return role === 'owner';
}

export function canWithProfile(profile: AclProfile, resource: Resource, action: Action): boolean {
  if (action === 'manage') return false;
  return profile.permissions[resource]?.[action as SystemAction] === true;
}

export function resolvePermission(
  role: UserRole | null | undefined,
  profile: AclProfile | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (role === 'owner') return true;
  if (profile) return canWithProfile(profile, resource, action);
  return false;
}
