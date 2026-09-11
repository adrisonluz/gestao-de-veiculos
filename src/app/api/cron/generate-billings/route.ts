import { NextRequest, NextResponse } from 'next/server';
import type { Firestore } from 'firebase-admin/firestore';
import { AdminTimestamp, getAdminDb } from '@/lib/firebase-admin';
import { decryptCoraCredentials, createCoraInvoiceForRecord } from '@/lib/integrations/cora-service';
import type { Client } from '@/lib/definitions';

export const dynamic = 'force-dynamic';

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDueDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 10);
}

async function triggerCoraChargeIfConfigured(
  adminDb: Firestore,
  companyId: string,
  financialRecordId: string,
  client: Pick<Client, 'name' | 'email' | 'cpf' | 'address'>,
  description: string,
  amount: number,
  dueDate: Date
): Promise<void> {
  const integrationSnap = await adminDb.collection('payment_integrations').doc(`${companyId}_cora`).get();

  if (!integrationSnap.exists || integrationSnap.data()?.enabled !== true) {
    return;
  }

  const recordRef = adminDb.collection('financialRecords').doc(financialRecordId);

  try {
    const credentials = decryptCoraCredentials(integrationSnap.data());
    const result = await createCoraInvoiceForRecord(credentials, client, financialRecordId, description, amount, dueDate);
    await recordRef.update(result);
  } catch (error) {
    console.error('Error creating Cora invoice for financial record:', financialRecordId, error);
    await recordRef.update({ externalProvider: 'cora', externalStatus: 'ERRO' });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();
  const monthKey = getMonthKey(now);
  const dueDate = getDueDate(now);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const companiesSnap = await db.collection('companies').where('active', '==', true).get();

    for (const companyDoc of companiesSnap.docs) {
      const companyId = companyDoc.id;

      const clientsSnap = await db
        .collection('clients')
        .where('companyId', '==', companyId)
        .where('billingType', '==', 'automatic')
        .get();

      for (const clientDoc of clientsSnap.docs) {
        try {
          const clientData = clientDoc.data();
          const consolidateBilling = clientData.consolidateBilling === true;
          const vehiclesSnap = await clientDoc.ref.collection('vehicles').get();

          if (vehiclesSnap.empty) {
            skipped++;
            continue;
          }

          if (consolidateBilling) {
            const totalValue = vehiclesSnap.docs.reduce(
              (sum, vehicleDoc) => sum + Number(vehicleDoc.data().value ?? 0),
              0
            );
            const recordId = `${clientDoc.id}_${monthKey}`;
            const recordRef = db.collection('financialRecords').doc(recordId);
            const existing = await recordRef.get();

            if (existing.exists) {
              skipped++;
              continue;
            }

            const description = `Cobrança consolidada automática (${monthKey})`;
            await recordRef.set({
              companyId,
              clientId: clientDoc.id,
              vehicleId: null,
              vehiclePlate: null,
              date: AdminTimestamp.fromDate(dueDate),
              description,
              amount: totalValue,
              status: 'Em aberto',
              createdAt: AdminTimestamp.now(),
            });
            created++;

            await triggerCoraChargeIfConfigured(
              db,
              companyId,
              recordId,
              { name: clientData.name, email: clientData.email, cpf: clientData.cpf, address: clientData.address },
              description,
              totalValue,
              dueDate
            );
          } else {
            for (const vehicleDoc of vehiclesSnap.docs) {
              const vehicleData = vehicleDoc.data();
              const recordId = `${clientDoc.id}_${vehicleDoc.id}_${monthKey}`;
              const recordRef = db.collection('financialRecords').doc(recordId);
              const existing = await recordRef.get();

              if (existing.exists) {
                skipped++;
                continue;
              }

              const vehicleAmount = Number(vehicleData.value ?? 0);
              const description = `Cobrança automática (${monthKey}) — ${vehicleData.plate ?? ''}`;
              await recordRef.set({
                companyId,
                clientId: clientDoc.id,
                vehicleId: vehicleDoc.id,
                vehiclePlate: vehicleData.plate ?? null,
                date: AdminTimestamp.fromDate(dueDate),
                description,
                amount: vehicleAmount,
                status: 'Em aberto',
                createdAt: AdminTimestamp.now(),
              });
              created++;

              await triggerCoraChargeIfConfigured(
                db,
                companyId,
                recordId,
                { name: clientData.name, email: clientData.email, cpf: clientData.cpf, address: clientData.address },
                description,
                vehicleAmount,
                dueDate
              );
            }
          }
        } catch (error) {
          console.error(`Error generating billing for client ${clientDoc.id}:`, error);
          errors.push(`client ${clientDoc.id}: ${(error as Error).message}`);
        }
      }
    }

    return NextResponse.json({ month: monthKey, created, skipped, errors });
  } catch (error) {
    console.error('Error generating automatic billings:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
