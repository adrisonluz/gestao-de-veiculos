
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addDoc, collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

const FormSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
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
    imageUrl: z.string().url().optional(),
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
    const { plate, model, brand, year, color, imageUrl } = VehicleSchema.parse(data);
    const clientRef = doc(db, 'clients', clientId);
  
    try {
      await updateDoc(clientRef, {
        vehicles: arrayUnion({
          plate,
          model,
          brand,
          year,
          color,
          imageUrl,
        }),
      });
      revalidatePath(`/clients/${clientId}`);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }
