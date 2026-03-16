
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Client, FinancialRecord, Vehicle } from './definitions';

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

export async function fetchClients(): Promise<Client[]> {
  const clientsCol = collection(db, 'clients');
  const clientSnapshot = await getDocs(clientsCol);
  const clientList = await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
    const clientData = clientDoc.data();
    const vehicles = await fetchClientVehicles(clientDoc.ref, clientData.vehicles || []);

    return {
      id: clientDoc.id,
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

export async function fetchClientById(id: string): Promise<Client | null> {
    const docRef = doc(db, 'clients', id);
    const docSnap = await getDoc(docRef);
  
    if (docSnap.exists()) {
      const data = docSnap.data();
      const vehicles = await fetchClientVehicles(docRef, data.vehicles || []);
  
      return {
        id: docSnap.id,
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

export async function getFinancialRecords(): Promise<FinancialRecord[]> {
  const recordsCol = collection(db, 'financialRecords');
  const recordSnapshot = await getDocs(recordsCol);
  const recordList = recordSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      date: data.date.toDate(),
      description: data.description,
      amount: data.amount,
      clientId: data.clientId,
    } as FinancialRecord;
  });
  return recordList;
}
