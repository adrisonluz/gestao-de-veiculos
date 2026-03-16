
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';

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
const VehicleSchema = z.object({
    plate: z.string(),
    model: z.string(),
    brand: z.string(),
    year: z.string(),
    color: z.string(),
    value: z.number(),
  });

export async function createClient(data: z.infer<typeof CreateClient>) {
  const { name, email, phone, billingType, cpf } = CreateClient.parse(data);

  try {
    await addDoc(collection(db, 'clients'), {
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

export async function createVehicle(clientId: string, data: z.infer<typeof VehicleSchema>) {
    const { plate, model, brand, year, color, value } = VehicleSchema.parse(data);
    const clientRef = doc(db, 'clients', clientId);
    const vehiclesCol = collection(clientRef, 'vehicles');
  
    try {
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

export async function deleteClient(clientId: string) {
  const clientRef = doc(db, 'clients', clientId);

  try {
    const vehiclesSnapshot = await getDocs(collection(clientRef, 'vehicles'));
    await Promise.all(vehiclesSnapshot.docs.map((vehicleDoc) => deleteDoc(vehicleDoc.ref)));

    await deleteDoc(clientRef);

    revalidatePath('/clients');
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
}
