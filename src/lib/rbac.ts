import type { UserRole, SystemArea, SystemAction, PermissionSet, AclProfile } from './definitions';

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

const rolePermissions: Record<UserRole, Partial<Record<SystemArea, (SystemAction | 'manage')[]>>> = {
  owner: {
    dashboard: ['read', 'manage'],
    clients: ['read', 'create', 'update', 'delete', 'manage'],
    vehicles: ['read', 'create', 'update', 'delete', 'manage'],
    financialRecords: ['read', 'create', 'update', 'delete', 'manage'],
    billing: ['read', 'create', 'update', 'delete', 'manage'],
    reports: ['read', 'export', 'manage'],
    users: ['read', 'create', 'update', 'delete', 'manage'],
    acl: ['read', 'create', 'update', 'delete', 'manage'],
    settings: ['read', 'update', 'manage'],
  },
  admin: {
    dashboard: ['read'],
    clients: ['read', 'create', 'update', 'delete'],
    vehicles: ['read', 'create', 'update', 'delete'],
    financialRecords: ['read', 'create', 'update', 'delete'],
    billing: ['read', 'create', 'update', 'delete'],
    reports: ['read', 'export'],
    users: ['read', 'create', 'update'],
    acl: ['read', 'create', 'update', 'delete'],
    settings: ['read', 'update'],
  },
  manager: {
    dashboard: ['read'],
    clients: ['read', 'create', 'update'],
    vehicles: ['read', 'create', 'update'],
    financialRecords: ['read'],
    billing: ['read'],
    reports: ['read'],
    users: ['read'],
    acl: ['read'],
    settings: ['read'],
  },
  financial: {
    dashboard: ['read'],
    clients: ['read'],
    vehicles: ['read'],
    financialRecords: ['read', 'create', 'update', 'delete'],
    billing: ['read', 'create', 'update', 'delete'],
    reports: ['read', 'export'],
    users: ['read'],
    acl: [],
    settings: ['read'],
  },
  viewer: {
    dashboard: ['read'],
    clients: ['read'],
    vehicles: ['read'],
    financialRecords: ['read'],
    billing: ['read'],
    reports: ['read'],
    users: ['read'],
    acl: [],
    settings: ['read'],
  },
};

export function can(role: UserRole | null | undefined, resource: Resource, action: Action): boolean {
  if (!role) return false;
  const permissions = rolePermissions[role]?.[resource] ?? [];
  return permissions.includes(action as SystemAction) || permissions.includes('manage');
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
  if (profile) {
    return canWithProfile(profile, resource, action);
  }
  return can(role, resource, action);
}

export function buildDefaultPermissions(role: UserRole): PermissionSet {
  const result: PermissionSet = {};
  for (const area of Object.keys(SYSTEM_AREAS) as SystemArea[]) {
    const allowed = rolePermissions[role]?.[area] ?? [];
    result[area] = {};
    for (const action of SYSTEM_AREAS[area].actions) {
      result[area]![action] = allowed.includes(action) || allowed.includes('manage');
    }
  }
  return result;
}
