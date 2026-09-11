import { decryptSecret } from '../crypto';
import { createCoraInvoice, type CoraCredentials, type CoraInvoiceInput } from './cora-client';
import type { Client, FinancialRecord } from '../definitions';

export function decryptCoraCredentials(integrationData: any): CoraCredentials {
  const parsed = JSON.parse(decryptSecret(integrationData.credentials));
  return {
    environment: integrationData.environment,
    clientId: parsed.clientId,
    certificate: parsed.certificate,
    privateKey: parsed.privateKey,
  };
}

export function buildCoraInvoiceInput(
  client: Pick<Client, 'name' | 'email' | 'cpf' | 'address'>,
  financialRecordId: string,
  description: string,
  amount: number,
  dueDate: Date
): CoraInvoiceInput {
  const documentDigits = (client.cpf ?? '').replace(/\D/g, '');

  return {
    code: financialRecordId,
    customerName: client.name,
    customerEmail: client.email || undefined,
    customerDocument: documentDigits,
    customerDocumentType: documentDigits.length > 11 ? 'CNPJ' : 'CPF',
    address: {
      street: client.address?.street ?? '',
      number: client.address?.number ?? '',
      district: client.address?.district ?? '',
      city: client.address?.city ?? '',
      state: client.address?.state ?? '',
      zipCode: client.address?.zipCode ?? '',
      complement: client.address?.complement,
    },
    description,
    amount,
    dueDate: dueDate.toISOString().slice(0, 10),
  };
}

export function applyCoraInvoiceResult(invoice: {
  id: string;
  status: string;
  bankSlip?: { url?: string };
  pix?: { emv?: string };
}): Partial<FinancialRecord> {
  return {
    externalProvider: 'cora',
    externalInvoiceId: invoice.id,
    externalStatus: invoice.status,
    paymentLinkUrl: invoice.bankSlip?.url,
    pixCopyPaste: invoice.pix?.emv,
  };
}

export async function createCoraInvoiceForRecord(
  credentials: CoraCredentials,
  client: Pick<Client, 'name' | 'email' | 'cpf' | 'address'>,
  financialRecordId: string,
  description: string,
  amount: number,
  dueDate: Date
) {
  const input = buildCoraInvoiceInput(client, financialRecordId, description, amount, dueDate);
  const invoice = await createCoraInvoice(credentials, input);
  return applyCoraInvoiceResult(invoice);
}
