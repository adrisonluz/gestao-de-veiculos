import type { UserRole } from './definitions';

export type Resource = 'clients' | 'vehicles' | 'financialRecords' | 'billing' | 'users';
export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage';

const rolePermissions: Record<UserRole, Record<Resource, Action[]>> = {
  owner: {
    clients: ['read', 'create', 'update', 'delete', 'manage'],
    vehicles: ['read', 'create', 'update', 'delete', 'manage'],
    financialRecords: ['read', 'create', 'update', 'delete', 'manage'],
    billing: ['read', 'create', 'update', 'delete', 'manage'],
    users: ['read', 'create', 'update', 'delete', 'manage'],
  },
  admin: {
    clients: ['read', 'create', 'update', 'delete'],
    vehicles: ['read', 'create', 'update', 'delete'],
    financialRecords: ['read', 'create', 'update', 'delete'],
    billing: ['read', 'create', 'update', 'delete'],
    users: ['read', 'create', 'update'],
  },
  manager: {
    clients: ['read', 'create', 'update'],
    vehicles: ['read', 'create', 'update'],
    financialRecords: ['read'],
    billing: ['read'],
    users: ['read'],
  },
  financial: {
    clients: ['read'],
    vehicles: ['read'],
    financialRecords: ['read', 'create', 'update', 'delete'],
    billing: ['read', 'create', 'update', 'delete'],
    users: ['read'],
  },
  viewer: {
    clients: ['read'],
    vehicles: ['read'],
    financialRecords: ['read'],
    billing: ['read'],
    users: ['read'],
  },
};

export function can(role: UserRole | null | undefined, resource: Resource, action: Action): boolean {
  if (!role) {
    return false;
  }

  const permissions = rolePermissions[role]?.[resource] ?? [];
  return permissions.includes(action) || permissions.includes('manage');
}