import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { decryptCoraCredentials } from '@/lib/integrations/cora-service';
import { getCoraInvoice } from '@/lib/integrations/cora-client';

export const dynamic = 'force-dynamic';

// O Cora não manda corpo nem assinatura no webhook — só cabeçalhos avisando o evento.
// Por segurança, tratamos isso apenas como um aviso: sempre re-consultamos o status
// oficial direto na API do Cora (com as credenciais da própria empresa) antes de dar
// baixa em qualquer cobrança, então o payload recebido aqui nunca é usado como prova.
export async function POST(request: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const eventType = request.headers.get('webhook-event-type');
  const resourceId = request.headers.get('webhook-resource-id');

  if (!resourceId || eventType !== 'invoice.paid') {
    return NextResponse.json({ ignored: true });
  }

  const adminDb = getAdminDb();
  const integrationSnap = await adminDb.collection('payment_integrations').doc(`${companyId}_cora`).get();

  if (!integrationSnap.exists || integrationSnap.data()?.enabled !== true) {
    return NextResponse.json({ ignored: true });
  }

  try {
    const credentials = decryptCoraCredentials(integrationSnap.data());
    const invoice = await getCoraInvoice(credentials, resourceId);

    if (invoice.status === 'PAID' && invoice.code) {
      await adminDb.collection('financialRecords').doc(invoice.code).update({
        status: 'Pago',
        externalStatus: invoice.status,
      });
    }

    return NextResponse.json({ processed: true });
  } catch (error) {
    console.error(`Error processing Cora webhook for company ${companyId}:`, error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
