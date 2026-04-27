
import { db } from './firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import type { Client, FinancialRecord, Vehicle } from './definitions';

function mapLegacyVehicle(vehicle: any, fallbackId: string): Vehicle {
  return {
    id: vehicle?.id ?? fallbackId,
    plate: vehicle?.plate ?? '',
    model: vehicle?.model ?? '',
    brand: vehicle?.brand,
    year: vehicle?.year,
    color: vehicle?.color,
    value: Number(vehicle?.value ?? 0),
    images: Array.isArray(vehicle?.images) ? vehicle.images : [],
    files: Array.isArray(vehicle?.files) ? vehicle.files : [],
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
      documents: Array.isArray(clientData.documents) ? clientData.documents : [],
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
        documents: Array.isArray(data.documents) ? data.documents : [],
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
