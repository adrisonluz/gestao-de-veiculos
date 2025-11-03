
import { db } from './firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Client, FinancialRecord } from './definitions';

export async function fetchClients(): Promise<Client[]> {
  const clientsCol = collection(db, 'clients');
  const clientSnapshot = await getDocs(clientsCol);
  const clientList = await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
    const clientData = clientDoc.data();
    const vehiclesCol = collection(clientDoc.ref, 'vehicles');
    const vehicleSnapshot = await getDocs(vehiclesCol);
    const vehicles = vehicleSnapshot.docs.map(vehicleDoc => vehicleDoc.data());

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
      const vehiclesCol = collection(docRef, 'vehicles');
      const vehicleSnapshot = await getDocs(vehiclesCol);
      const vehicles = vehicleSnapshot.docs.map(vehicleDoc => vehicleDoc.data());
  
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
