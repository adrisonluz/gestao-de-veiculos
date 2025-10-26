
export type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: string;
  cpf: string;
  billingType: 'manual' | 'automatic';
  vehicles: Vehicle[];
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  value: number;
  images: string[];
};

export type FinancialRecord = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  clientId: string;
};
