
export type UserRole = 'owner' | 'member';

export type UploadedFile = {
  url: string;
  name: string;
  path: string;
}

export type SystemArea =
  | 'dashboard'
  | 'clients'
  | 'vehicles'
  | 'financialRecords'
  | 'billing'
  | 'reports'
  | 'users'
  | 'acl'
  | 'settings';

export type SystemAction = 'read' | 'create' | 'update' | 'delete' | 'export';

export type PermissionSet = Partial<Record<SystemArea, Partial<Record<SystemAction, boolean>>>>;

export type AclProfile = {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  permissions: PermissionSet;
  isSystem: boolean;
  createdAt: Date;
  createdBy: string;
};

export type Company = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export type CompanyMembership = {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled';
  aclProfileId?: string;
};

export type CompanyMember = {
  membershipId: string;
  userId: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled';
  aclProfileId?: string;
  aclProfileName?: string;
};

export type UserProfile = {
  id: string;
  activeCompanyId: string;
};

export type Client = {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  cpf: string;
  billingType: 'manual' | 'automatic';
  vehicles: Vehicle[];
  documents: UploadedFile[];
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  brand?: string;
  year?: string;
  color?: string;
  value: number;
  images: string[];
  files: UploadedFile[];
};

export type FinancialRecord = {
  id: string;
  companyId: string;
  date: Date;
  description: string;
  amount: number;
  clientId: string;
  status?: 'Em aberto' | 'Vencido' | 'Pago' | 'Cancelado' | 'Sem status';
};
