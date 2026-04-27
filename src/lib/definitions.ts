
export type UserRole = 'owner' | 'admin' | 'manager' | 'financial' | 'viewer';

export type UploadedFile = {
  url: string;
  name: string;
  path: string;
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
