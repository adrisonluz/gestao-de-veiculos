
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

const FormSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  billingType: z.enum(['manual', 'automatic']),
  cpf: z.string().optional(),
});

const CreateClient = FormSchema;

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
