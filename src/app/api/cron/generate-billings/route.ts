import { NextRequest, NextResponse } from 'next/server';
import { AdminTimestamp, getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDueDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 10);
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
            const recordRef = db.collection('financialRecords').doc(`${clientDoc.id}_${monthKey}`);
            const existing = await recordRef.get();

            if (existing.exists) {
              skipped++;
              continue;
            }

            await recordRef.set({
              companyId,
              clientId: clientDoc.id,
              vehicleId: null,
              vehiclePlate: null,
              date: AdminTimestamp.fromDate(dueDate),
              description: `Cobrança consolidada automática (${monthKey})`,
              amount: totalValue,
              status: 'Em aberto',
              createdAt: AdminTimestamp.now(),
            });
            created++;
          } else {
            for (const vehicleDoc of vehiclesSnap.docs) {
              const vehicleData = vehicleDoc.data();
              const recordRef = db
                .collection('financialRecords')
                .doc(`${clientDoc.id}_${vehicleDoc.id}_${monthKey}`);
              const existing = await recordRef.get();

              if (existing.exists) {
                skipped++;
                continue;
              }

              await recordRef.set({
                companyId,
                clientId: clientDoc.id,
                vehicleId: vehicleDoc.id,
                vehiclePlate: vehicleData.plate ?? null,
                date: AdminTimestamp.fromDate(dueDate),
                description: `Cobrança automática (${monthKey}) — ${vehicleData.plate ?? ''}`,
                amount: Number(vehicleData.value ?? 0),
                status: 'Em aberto',
                createdAt: AdminTimestamp.now(),
              });
              created++;
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
