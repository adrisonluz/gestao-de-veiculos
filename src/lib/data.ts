
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import type { AclProfile, Client, CompanyMember, FinancialRecord, Vehicle } from './definitions';

function mapLegacyVehicle(vehicle: any, fallbackId: string): Vehicle {
  return {
    id: vehicle?.id ?? fallbackId,
    plate: vehicle?.plate ?? '',
    model: vehicle?.model ?? '',
    value: Number(vehicle?.value ?? 0),
    images: Array.isArray(vehicle?.images) ? vehicle.images : [],
  };
}

async function fetchClientVehicles(clientRef: ReturnType<typeof doc>, fallbackVehicles: any[] = []): Promise<Vehicle[]> {
  const vehiclesCol = collection(clientRef, 'vehicles');
  const vehicleSnapshot = await getDocs(vehiclesCol);

  if (!vehicleSnapshot.empty) {
    return vehicleSnapshot.docs.map((vehicleDoc) =>
      mapLegacyVehicle(vehicleDoc.data(), vehicleDoc.id)
    );
  }

  return fallbackVehicles.map((vehicle, index) =>
    mapLegacyVehicle(vehicle, `${clientRef.id}-${index}`)
  );
}

export async function fetchClients(companyId: string): Promise<Client[]> {
  const clientsCol = collection(db, 'clients');
  const clientsQuery = query(clientsCol, where('companyId', '==', companyId));
  const clientSnapshot = await getDocs(clientsQuery);
  const clientList = await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
    const clientData = clientDoc.data();
    const vehicles = await fetchClientVehicles(clientDoc.ref, clientData.vehicles || []);

    return {
      id: clientDoc.id,
      companyId: clientData.companyId,
      name: clientData.name,
      email: clientData.email,
      address: clientData.address,
      cpf: clientData.cpf,
      billingType: clientData.billingType,
      vehicles: vehicles || [],
    } as Client;
  }));

  return clientList;
}

export async function fetchClientById(companyId: string, id: string): Promise<Client | null> {
    const docRef = doc(db, 'clients', id);
    const docSnap = await getDoc(docRef);
  
    if (docSnap.exists()) {
      const data = docSnap.data();

      if (data.companyId !== companyId) {
        return null;
      }

      const vehicles = await fetchClientVehicles(docRef, data.vehicles || []);
  
      return {
        id: docSnap.id,
        companyId: data.companyId,
        name: data.name,
        email: data.email,
        address: data.address,
        cpf: data.cpf,
        billingType: data.billingType,
        vehicles: vehicles || [],
      } as Client;
    } else {
      return null;
    }
  }

export async function getFinancialRecords(companyId: string): Promise<FinancialRecord[]> {
  const recordsCol = collection(db, 'financialRecords');
  const recordsQuery = query(recordsCol, where('companyId', '==', companyId));
  const recordSnapshot = await getDocs(recordsQuery);
  const recordList = recordSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      companyId: data.companyId,
      date: data.date.toDate(),
      description: data.description,
      amount: data.amount,
      clientId: data.clientId,
      status: data.status || 'Sem status',
    } as FinancialRecord;
  });
  return recordList;
}

export async function fetchAclProfiles(companyId: string): Promise<AclProfile[]> {
  const profilesCol = collection(db, 'acl_profiles');
  const profilesQuery = query(
    profilesCol,
    where('companyId', '==', companyId),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(profilesQuery);
  return snapshot.docs.map((profileDoc) => {
    const data = profileDoc.data();
    return {
      id: profileDoc.id,
      companyId: data.companyId,
      name: data.name,
      description: data.description ?? '',
      permissions: data.permissions ?? {},
      isSystem: data.isSystem ?? false,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      createdBy: data.createdBy ?? '',
    } as AclProfile;
  });
}

export async function fetchAclProfileById(companyId: string, profileId: string): Promise<AclProfile | null> {
  const profileRef = doc(db, 'acl_profiles', profileId);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) return null;
  const data = profileSnap.data();
  if (data.companyId !== companyId) return null;
  return {
    id: profileSnap.id,
    companyId: data.companyId,
    name: data.name,
    description: data.description ?? '',
    permissions: data.permissions ?? {},
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    createdBy: data.createdBy ?? '',
  } as AclProfile;
}

export async function fetchCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  const membershipsCol = collection(db, 'company_memberships');
  const membershipsQuery = query(membershipsCol, where('companyId', '==', companyId));
  const snapshot = await getDocs(membershipsQuery);

  const profiles = await fetchAclProfiles(companyId);
  const profileMap = new Map(profiles.map((p) => [p.id, p.name]));

  return snapshot.docs.map((memberDoc) => {
    const data = memberDoc.data();
    return {
      membershipId: memberDoc.id,
      userId: data.userId,
      email: data.email ?? '',
      displayName: data.displayName,
      role: data.role,
      status: data.status,
      aclProfileId: data.aclProfileId,
      aclProfileName: data.aclProfileId ? profileMap.get(data.aclProfileId) : undefined,
    } as CompanyMember;
  });
}
