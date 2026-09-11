
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
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { canWithProfile, type Resource, type Action } from './rbac';
import type { AclProfile, PermissionSet, UserRole } from './definitions';
import { isValidCpfOrCnpj, isValidPlate } from './input-masks';

async function checkPermission(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  resource: Resource,
  action: Action
): Promise<boolean> {
  if (actorRole === 'owner') return true;
  if (!aclProfileId) return false;
  const profileRef = doc(db, 'acl_profiles', aclProfileId);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists() || profileSnap.data().companyId !== companyId) return false;
  const data = profileSnap.data();
  const profile: AclProfile = {
    id: profileSnap.id,
    companyId: data.companyId,
    name: data.name,
    description: data.description ?? '',
    permissions: data.permissions ?? {},
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    createdBy: data.createdBy ?? '',
  };
  return canWithProfile(profile, resource, action);
}

const FormSchema = z.object({
  name: z.string(),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().email().transform((value) => value.trim().toLowerCase()).optional()
  ),
  phone: z
    .string()
    .optional()
    .refine((value) => !value || value.replace(/\D/g, '').length >= 10, 'Telefone inválido'),
  billingType: z.enum(['manual', 'automatic']),
  cpf: z.string().optional(),
  consolidateBilling: z.boolean().optional().default(false),
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
  vehicleId: z.string().optional(),
  dueDate: z.string(),
  value: z.number().min(0),
  status: z.enum(['Em aberto', 'Vencido', 'Pago', 'Cancelado']),
});

export async function createClient(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  data: z.infer<typeof CreateClient>
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'clients', 'create')) {
    throw new Error('Permissão insuficiente para criar clientes.');
  }

  const { name, email, phone, billingType, cpf, consolidateBilling } = CreateClient.parse(data);

  try {
    await addDoc(collection(db, 'clients'), {
      companyId,
      name,
      email: email ?? null,
      phone: phone ?? null,
      billingType,
      cpf: cpf ?? null,
      consolidateBilling,
      address: 'Endereço mockado',
      vehicles: [],
    });
    revalidatePath('/clients');
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

export async function updateClientBillingSettings(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  clientId: string,
  consolidateBilling: boolean
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'clients', 'update')) {
    throw new Error('Permissão insuficiente para editar clientes.');
  }

  const clientRef = doc(db, 'clients', clientId);
  const clientSnap = await getDoc(clientRef);

  if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
    throw new Error('Cliente não pertence à empresa ativa.');
  }

  await updateDoc(clientRef, { consolidateBilling });
  revalidatePath(`/clients/${clientId}`);
}

export async function createVehicle(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  clientId: string,
  data: z.infer<typeof VehicleSchema>
) {
    if (!await checkPermission(companyId, actorRole, aclProfileId, 'vehicles', 'create')) {
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

export async function updateVehicle(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  clientId: string,
  vehicleId: string,
  data: z.infer<typeof VehicleSchema>
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'vehicles', 'update')) {
    throw new Error('Permissão insuficiente para editar veículos.');
  }

  const { plate, model, brand, year, color, value } = VehicleSchema.parse(data);
  const clientRef = doc(db, 'clients', clientId);
  const vehicleRef = doc(clientRef, 'vehicles', vehicleId);

  try {
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
      throw new Error('Cliente não pertence à empresa ativa.');
    }

    await updateDoc(vehicleRef, { plate, model, brand, year, color, value });
    revalidatePath(`/clients/${clientId}`);
    revalidatePath(`/clients/${clientId}/vehicles/${vehicleId}`);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

export async function deleteVehicle(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  clientId: string,
  vehicleId: string
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'vehicles', 'delete')) {
    throw new Error('Permissão insuficiente para excluir veículos.');
  }

  const clientRef = doc(db, 'clients', clientId);
  const vehicleRef = doc(clientRef, 'vehicles', vehicleId);

  try {
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
      throw new Error('Cliente não pertence à empresa ativa.');
    }

    await deleteDoc(vehicleRef);
    revalidatePath(`/clients/${clientId}`);
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    throw error;
  }
}

export async function deleteClient(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  clientId: string
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'clients', 'delete')) {
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
  aclProfileId: string | null | undefined,
  clientId: string,
  data: z.infer<typeof BillingSchema>
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'billing', 'create')) {
    throw new Error('Permissão insuficiente para criar cobranças.');
  }

  const { vehicleId, dueDate, value, status } = BillingSchema.parse(data);
  const clientRef = doc(db, 'clients', clientId);

  try {
    const clientSnap = await getDoc(clientRef);

    if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
      throw new Error('Cliente não pertence à empresa ativa.');
    }

    const consolidateBilling = clientSnap.data().consolidateBilling === true;

    let vehiclePlate: string | null = null;
    if (!consolidateBilling && vehicleId) {
      const vehicleSnap = await getDoc(doc(clientRef, 'vehicles', vehicleId));
      if (vehicleSnap.exists()) {
        vehiclePlate = vehicleSnap.data().plate ?? null;
      }
    }

    const dueDateObject = new Date(`${dueDate}T00:00:00`);
    const description = consolidateBilling
      ? `Cobrança consolidada (${status})`
      : vehiclePlate
        ? `Cobrança (${status}) — ${vehiclePlate}`
        : `Cobrança (${status})`;

    await addDoc(collection(db, 'financialRecords'), {
      companyId,
      clientId,
      vehicleId: !consolidateBilling && vehicleId ? vehicleId : null,
      vehiclePlate: !consolidateBilling ? vehiclePlate : null,
      date: Timestamp.fromDate(dueDateObject),
      description,
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
  aclProfileId: string | null | undefined,
  recordId: string,
  status: 'Em aberto' | 'Vencido' | 'Pago' | 'Cancelado'
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'billing', 'update')) {
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

const AclProfileSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  permissions: z.record(z.string(), z.record(z.string(), z.boolean())),
});

export async function createAclProfile(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  data: { name: string; description?: string; permissions: PermissionSet }
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'acl', 'create')) {
    throw new Error('Permissão insuficiente para criar perfis de acesso.');
  }

  const parsed = AclProfileSchema.parse(data);

  await addDoc(collection(db, 'acl_profiles'), {
    companyId,
    name: parsed.name.trim(),
    description: parsed.description?.trim() ?? '',
    permissions: parsed.permissions,
    isSystem: false,
    createdAt: serverTimestamp(),
    createdBy: '',
  });

  revalidatePath('/settings/acl');
}

export async function updateAclProfile(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  profileId: string,
  data: { name: string; description?: string; permissions: PermissionSet }
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'acl', 'update')) {
    throw new Error('Permissão insuficiente para editar perfis de acesso.');
  }

  const profileRef = doc(db, 'acl_profiles', profileId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists() || profileSnap.data().companyId !== companyId) {
    throw new Error('Perfil não encontrado.');
  }

  if (profileSnap.data().isSystem) {
    throw new Error('Perfis do sistema não podem ser editados.');
  }

  const parsed = AclProfileSchema.parse(data);

  await updateDoc(profileRef, {
    name: parsed.name.trim(),
    description: parsed.description?.trim() ?? '',
    permissions: parsed.permissions,
  });

  revalidatePath('/settings/acl');
}

export async function deleteAclProfile(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  profileId: string
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'acl', 'delete')) {
    throw new Error('Permissão insuficiente para excluir perfis de acesso.');
  }

  const profileRef = doc(db, 'acl_profiles', profileId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists() || profileSnap.data().companyId !== companyId) {
    throw new Error('Perfil não encontrado.');
  }

  if (profileSnap.data().isSystem) {
    throw new Error('Perfis do sistema não podem ser excluídos.');
  }

  const membershipsQuery = query(
    collection(db, 'company_memberships'),
    where('companyId', '==', companyId),
    where('aclProfileId', '==', profileId)
  );
  const membershipsSnap = await getDocs(membershipsQuery);
  await Promise.all(
    membershipsSnap.docs.map((membershipDoc) =>
      updateDoc(membershipDoc.ref, { aclProfileId: null })
    )
  );

  await deleteDoc(profileRef);

  revalidatePath('/settings/acl');
}

export async function assignAclProfile(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  membershipId: string,
  profileId: string | null
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'acl', 'update')) {
    throw new Error('Permissão insuficiente para atribuir perfis de acesso.');
  }

  const membershipRef = doc(db, 'company_memberships', membershipId);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists() || membershipSnap.data().companyId !== companyId) {
    throw new Error('Membro não encontrado.');
  }

  if (profileId !== null) {
    const profileRef = doc(db, 'acl_profiles', profileId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists() || profileSnap.data().companyId !== companyId) {
      throw new Error('Perfil não encontrado.');
    }
  }

  await updateDoc(membershipRef, { aclProfileId: profileId ?? null });

  revalidatePath('/settings/acl');
}

async function countActiveOwners(companyId: string): Promise<number> {
  const ownersQuery = query(
    collection(db, 'company_memberships'),
    where('companyId', '==', companyId),
    where('role', '==', 'owner'),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(ownersQuery);
  return snapshot.size;
}

export async function updateMemberStatus(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  membershipId: string,
  status: 'active' | 'disabled'
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'users', 'update')) {
    throw new Error('Permissão insuficiente para editar membros.');
  }

  const membershipRef = doc(db, 'company_memberships', membershipId);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists() || membershipSnap.data().companyId !== companyId) {
    throw new Error('Membro não encontrado.');
  }

  const memberData = membershipSnap.data();

  if (memberData.role === 'owner' && actorRole !== 'owner') {
    throw new Error('Apenas proprietários podem alterar o status de outro proprietário.');
  }

  if (status === 'disabled' && memberData.role === 'owner' && memberData.status === 'active') {
    if (await countActiveOwners(companyId) <= 1) {
      throw new Error('Não é possível desativar o único proprietário ativo da empresa.');
    }
  }

  await updateDoc(membershipRef, { status });
  revalidatePath('/settings/acl');
}

export async function updateMemberRole(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  membershipId: string,
  role: UserRole
) {
  if (actorRole !== 'owner') {
    throw new Error('Apenas proprietários podem alterar a função de um membro.');
  }

  const membershipRef = doc(db, 'company_memberships', membershipId);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists() || membershipSnap.data().companyId !== companyId) {
    throw new Error('Membro não encontrado.');
  }

  const memberData = membershipSnap.data();

  if (memberData.role === 'owner' && role === 'member' && memberData.status === 'active') {
    if (await countActiveOwners(companyId) <= 1) {
      throw new Error('Não é possível rebaixar o único proprietário ativo da empresa.');
    }
  }

  await updateDoc(membershipRef, { role });
  revalidatePath('/settings/acl');
}

export async function removeMember(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  membershipId: string
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'users', 'delete')) {
    throw new Error('Permissão insuficiente para remover membros.');
  }

  const membershipRef = doc(db, 'company_memberships', membershipId);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists() || membershipSnap.data().companyId !== companyId) {
    throw new Error('Membro não encontrado.');
  }

  const memberData = membershipSnap.data();

  if (memberData.role === 'owner' && actorRole !== 'owner') {
    throw new Error('Apenas proprietários podem remover outro proprietário.');
  }

  if (memberData.role === 'owner' && memberData.status === 'active') {
    if (await countActiveOwners(companyId) <= 1) {
      throw new Error('Não é possível remover o único proprietário ativo da empresa.');
    }
  }

  await deleteDoc(membershipRef);
  revalidatePath('/settings/acl');
}

export async function resendInvite(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  membershipId: string
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'users', 'update')) {
    throw new Error('Permissão insuficiente para reenviar convites.');
  }

  const membershipRef = doc(db, 'company_memberships', membershipId);
  const membershipSnap = await getDoc(membershipRef);

  if (!membershipSnap.exists() || membershipSnap.data().companyId !== companyId) {
    throw new Error('Convite não encontrado.');
  }

  if (membershipSnap.data().status !== 'invited') {
    throw new Error('Este membro já está ativo na empresa.');
  }

  await updateDoc(membershipRef, { invitedAt: serverTimestamp() });
  revalidatePath('/settings/acl');
}

export async function claimPendingInvites(userId: string, email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return;

  const invitesQuery = query(
    collection(db, 'company_memberships'),
    where('email', '==', normalizedEmail),
    where('status', '==', 'invited')
  );
  const invitesSnap = await getDocs(invitesQuery);
  if (invitesSnap.empty) return;

  await Promise.all(
    invitesSnap.docs.map((inviteDoc) => updateDoc(inviteDoc.ref, { userId, status: 'active' }))
  );
}

export async function inviteMember(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  data: { email: string; aclProfileId?: string }
) {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'users', 'create')) {
    throw new Error('Permissão insuficiente para convidar membros.');
  }

  const InviteSchema = z.object({
    email: z.string().email(),
    aclProfileId: z.string().optional(),
  });

  const parsed = InviteSchema.parse(data);

  const existingQuery = query(
    collection(db, 'company_memberships'),
    where('companyId', '==', companyId),
    where('email', '==', parsed.email.toLowerCase())
  );
  const existingSnap = await getDocs(existingQuery);
  if (!existingSnap.empty) {
    throw new Error('Este e-mail já é membro da empresa.');
  }

  await addDoc(collection(db, 'company_memberships'), {
    companyId,
    userId: '',
    email: parsed.email.toLowerCase(),
    role: 'member',
    status: 'invited',
    aclProfileId: parsed.aclProfileId ?? null,
    createdAt: serverTimestamp(),
    invitedAt: serverTimestamp(),
  });

  revalidatePath('/settings/acl');
}

function slugifyCompanyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

const ImportRowSchema = z.object({
  clientId: z.string().optional(),
  name: z.string().min(2),
  email: z.string().optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  billingType: z.enum(['manual', 'automatic']).optional().default('manual'),
  consolidateBilling: z.boolean().optional().default(false),
  vehiclePlate: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleBrand: z.string().optional(),
  vehicleYear: z.string().optional(),
  vehicleColor: z.string().optional(),
  vehicleValue: z.number().optional(),
});

type ImportRow = z.infer<typeof ImportRowSchema>;
type ImportGroup = {
  clientId?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  billingType: 'manual' | 'automatic';
  consolidateBilling: boolean;
  vehicles: { plate: string; model: string; brand: string; year: string; color: string; value: number }[];
};

export async function importClients(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  rows: unknown[]
): Promise<{ created: number; updated: number; errors: string[] }> {
  const canCreate = await checkPermission(companyId, actorRole, aclProfileId, 'clients', 'create');
  const canUpdate = await checkPermission(companyId, actorRole, aclProfileId, 'clients', 'update');

  if (!canCreate && !canUpdate) {
    throw new Error('Permissão insuficiente para importar clientes.');
  }

  const errors: string[] = [];
  const groups = new Map<string, ImportGroup>();

  for (const rawRow of rows) {
    let row: ImportRow;
    try {
      row = ImportRowSchema.parse(rawRow);
    } catch {
      errors.push('Linha inválida: campos obrigatórios ausentes ou mal formatados.');
      continue;
    }

    if (row.cpf && !isValidCpfOrCnpj(row.cpf)) {
      errors.push(`${row.name}: CPF/CNPJ inválido (${row.cpf}).`);
      continue;
    }

    if (row.vehiclePlate && !isValidPlate(row.vehiclePlate)) {
      errors.push(`${row.name}: placa inválida (${row.vehiclePlate}).`);
      continue;
    }

    const key = row.clientId || row.cpf || `${row.name.trim().toLowerCase()}|${row.email ?? ''}|${row.phone ?? ''}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        clientId: row.clientId,
        name: row.name,
        email: row.email,
        phone: row.phone,
        cpf: row.cpf,
        billingType: row.billingType,
        consolidateBilling: row.consolidateBilling,
        vehicles: [],
      };
      groups.set(key, group);
    }

    if (row.vehiclePlate) {
      group.vehicles.push({
        plate: row.vehiclePlate,
        model: row.vehicleModel ?? '',
        brand: row.vehicleBrand ?? '',
        year: row.vehicleYear ?? '',
        color: row.vehicleColor ?? '',
        value: row.vehicleValue ?? 0,
      });
    }
  }

  let created = 0;
  let updated = 0;

  for (const group of groups.values()) {
    try {
      let clientRef;

      if (group.clientId) {
        if (!canUpdate) {
          errors.push(`${group.name}: sem permissão para atualizar clientes.`);
          continue;
        }
        clientRef = doc(db, 'clients', group.clientId);
        const clientSnap = await getDoc(clientRef);
        if (!clientSnap.exists() || clientSnap.data().companyId !== companyId) {
          errors.push(`${group.name}: cliente informado (${group.clientId}) não encontrado.`);
          continue;
        }
        await updateDoc(clientRef, {
          name: group.name,
          email: group.email ?? null,
          phone: group.phone ?? null,
          cpf: group.cpf ?? null,
          billingType: group.billingType,
          consolidateBilling: group.consolidateBilling,
        });
        updated++;
      } else {
        if (!canCreate) {
          errors.push(`${group.name}: sem permissão para criar clientes.`);
          continue;
        }
        clientRef = await addDoc(collection(db, 'clients'), {
          companyId,
          name: group.name,
          email: group.email ?? null,
          phone: group.phone ?? null,
          cpf: group.cpf ?? null,
          billingType: group.billingType,
          consolidateBilling: group.consolidateBilling,
          address: 'Endereço mockado',
          vehicles: [],
        });
        created++;
      }

      if (group.vehicles.length > 0) {
        const vehiclesCol = collection(clientRef, 'vehicles');
        const existingByPlate = new Map<string, string>();

        if (group.clientId) {
          const existingSnap = await getDocs(vehiclesCol);
          existingSnap.docs.forEach((vehicleDoc) => {
            const plate = vehicleDoc.data().plate;
            if (plate) existingByPlate.set(String(plate).toUpperCase(), vehicleDoc.id);
          });
        }

        const batch = writeBatch(db);
        for (const vehicle of group.vehicles) {
          const existingId = existingByPlate.get(vehicle.plate.toUpperCase());
          const vehicleRef = existingId ? doc(vehiclesCol, existingId) : doc(vehiclesCol);
          batch.set(vehicleRef, vehicle, { merge: true });
        }
        await batch.commit();
      }
    } catch (error) {
      console.error('Error importing client:', error);
      errors.push(`${group.name}: erro inesperado ao salvar.`);
    }
  }

  revalidatePath('/clients');

  return { created, updated, errors };
}
