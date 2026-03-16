
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { can } from './rbac';
import type { UserRole } from './definitions';

const FormSchema = z.object({
  name: z.string(),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, '').length >= 10, 'Telefone inválido'),
  billingType: z.enum(['manual', 'automatic']),
  cpf: z.string().optional(),
});

const CreateClient = FormSchema;
const CreateCompanySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(80),
});
const VehicleSchema = z.object({
    plate: z.string(),
    model: z.string(),
    brand: z.string(),
    year: z.string(),
    color: z.string(),
    value: z.number(),
  });
const BillingSchema = z.object({
  dueDate: z.string(),
  value: z.number().min(0),
  status: z.enum(['Em aberto', 'Vencido', 'Pago', 'Cancelado']),
});

export async function createClient(companyId: string, actorRole: UserRole, data: z.infer<typeof CreateClient>) {
  if (!can(actorRole, 'clients', 'create')) {
    throw new Error('Permissão insuficiente para criar clientes.');
  }

  const { name, email, phone, billingType, cpf } = CreateClient.parse(data);

  try {
    await addDoc(collection(db, 'clients'), {
      companyId,
      name,
      email,
      phone,
      billingType,
      cpf,
      address: 'Endereço mockado',
      vehicles: [],
    });
    revalidatePath('/clients');
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

export async function createVehicle(
  companyId: string,
  actorRole: UserRole,
  clientId: string,
  data: z.infer<typeof VehicleSchema>
) {
    if (!can(actorRole, 'vehicles', 'create')) {
      throw new Error('Permissão insuficiente para criar veículos.');
    }

    const { plate, model, brand, year, color, value } = VehicleSchema.parse(data);
    const clientRef = doc(db, 'clients', clientId);
    const vehiclesCol = collection(clientRef, 'vehicles');
  
    try {
      const clientSnap = await getDoc(clientRef);

      if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
        throw new Error('Cliente não pertence à empresa ativa.');
      }

      await addDoc(vehiclesCol, {
        plate,
        model,
        brand,
        year,
        color,
        value,
      });
      revalidatePath(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

export async function deleteClient(companyId: string, actorRole: UserRole, clientId: string) {
  if (!can(actorRole, 'clients', 'delete')) {
    throw new Error('Permissão insuficiente para excluir clientes.');
  }

  const clientRef = doc(db, 'clients', clientId);

  try {
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
      throw new Error('Cliente não pertence à empresa ativa.');
    }

    const vehiclesSnapshot = await getDocs(collection(clientRef, 'vehicles'));
    await Promise.all(vehiclesSnapshot.docs.map((vehicleDoc) => deleteDoc(vehicleDoc.ref)));

    await deleteDoc(clientRef);

    revalidatePath('/clients');
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}

export async function createBilling(
  companyId: string,
  actorRole: UserRole,
  clientId: string,
  data: z.infer<typeof BillingSchema>
) {
  if (!can(actorRole, 'billing', 'create')) {
    throw new Error('Permissão insuficiente para criar cobranças.');
  }

  const { dueDate, value, status } = BillingSchema.parse(data);
  const clientRef = doc(db, 'clients', clientId);

  try {
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
      throw new Error('Cliente não pertence à empresa ativa.');
    }

    const dueDateObject = new Date(`${dueDate}T00:00:00`);

    await addDoc(collection(db, 'financialRecords'), {
      companyId,
      clientId,
      date: Timestamp.fromDate(dueDateObject),
      description: `Cobrança (${status})`,
      amount: value,
      status,
      createdAt: serverTimestamp(),
    });

    revalidatePath(`/clients/${clientId}`);
    revalidatePath('/reports');
    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error creating billing:', error);
    throw error;
  }
}

export async function updateBillingStatus(
  companyId: string,
  actorRole: UserRole,
  recordId: string,
  status: 'Em aberto' | 'Vencido' | 'Pago' | 'Cancelado'
) {
  if (!can(actorRole, 'billing', 'update')) {
    throw new Error('Permissão insuficiente para editar cobranças.');
  }

  const recordRef = doc(db, 'financialRecords', recordId);
  const recordSnap = await getDoc(recordRef);

  if (!recordSnap.exists() || recordSnap.data().companyId !== companyId) {
    throw new Error('Cobrança não encontrada ou não pertence à empresa ativa.');
  }

  await updateDoc(recordRef, { status });

  revalidatePath('/reports');
  revalidatePath('/dashboard');
}

function slugifyCompanyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function createInitialCompany(data: z.infer<typeof CreateCompanySchema>) {
  const { userId, name } = CreateCompanySchema.parse(data);

  const membershipQuery = query(
    collection(db, 'company_memberships'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );

  const membershipSnapshot = await getDocs(membershipQuery);
  if (!membershipSnapshot.empty) {
    throw new Error('Usuário já possui empresa ativa.');
  }

  const baseSlug = slugifyCompanyName(name) || 'minha-empresa';
  let slug = baseSlug;
  let slugSuffix = 1;

  while (true) {
    const slugQuery = query(collection(db, 'companies'), where('slug', '==', slug));
    const slugSnapshot = await getDocs(slugQuery);
    if (slugSnapshot.empty) {
      break;
    }

    slugSuffix += 1;
    slug = `${baseSlug}-${slugSuffix}`;
  }

  const companyDoc = await addDoc(collection(db, 'companies'), {
    name: name.trim(),
    slug,
    active: true,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, 'company_memberships'), {
    userId,
    companyId: companyDoc.id,
    role: 'owner',
    status: 'active',
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, 'user_profiles', userId),
    {
      activeCompanyId: companyDoc.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  revalidatePath('/dashboard');
  revalidatePath('/clients');

  return { companyId: companyDoc.id, slug };
}
