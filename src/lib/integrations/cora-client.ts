import https from 'https';
import { randomUUID } from 'crypto';

export type CoraEnvironment = 'sandbox' | 'production';

export type CoraCredentials = {
  environment: CoraEnvironment;
  clientId: string;
  certificate: string;
  privateKey: string;
};

export type CoraInvoiceInput = {
  code: string;
  customerName: string;
  customerEmail?: string;
  customerDocument: string;
  customerDocumentType: 'CPF' | 'CNPJ';
  address: {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  description: string;
  amount: number;
  dueDate: string;
};

export type CoraInvoice = {
  id: string;
  code?: string;
  status: string;
  totalAmount: number;
  totalPaid: number;
  bankSlip?: {
    barcode?: string;
    digitable?: string;
    url?: string;
  };
  pix?: {
    emv?: string;
  };
};

function getBaseUrl(environment: CoraEnvironment): string {
  return environment === 'production'
    ? 'https://matls-clients.api.cora.com.br'
    : 'https://matls-clients.api.stage.cora.com.br';
}

function request(
  credentials: Pick<CoraCredentials, 'certificate' | 'privateKey'>,
  options: {
    hostname: string;
    path: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        cert: credentials.certificate,
        key: credentials.privateKey,
        headers: options.headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let body: any = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            body = raw;
          }
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getAccessToken(credentials: CoraCredentials): Promise<string> {
  const baseUrl = new URL(getBaseUrl(credentials.environment));
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentials.clientId,
  }).toString();

  const { statusCode, body: responseBody } = await request(credentials, {
    hostname: baseUrl.hostname,
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body,
  });

  if (statusCode !== 200 || !responseBody?.access_token) {
    throw new Error(`Falha ao autenticar com o Cora (status ${statusCode}): ${JSON.stringify(responseBody)}`);
  }

  return responseBody.access_token as string;
}

async function authorizedRequest(
  credentials: CoraCredentials,
  path: string,
  method: string,
  payload?: unknown
): Promise<{ statusCode: number; body: any }> {
  const token = await getAccessToken(credentials);
  const baseUrl = new URL(getBaseUrl(credentials.environment));
  const body = payload ? JSON.stringify(payload) : undefined;

  return request(credentials, {
    hostname: baseUrl.hostname,
    path,
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
      ...(body ? { 'Content-Length': Buffer.byteLength(body).toString() } : {}),
    },
    body,
  });
}

export async function testCoraCredentials(credentials: CoraCredentials): Promise<void> {
  await getAccessToken(credentials);
}

export async function createCoraInvoice(
  credentials: CoraCredentials,
  input: CoraInvoiceInput
): Promise<CoraInvoice> {
  const payload = {
    code: input.code,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
      document: {
        identity: input.customerDocument,
        type: input.customerDocumentType,
      },
      address: {
        street: input.address.street,
        number: input.address.number,
        district: input.address.district,
        city: input.address.city,
        state: input.address.state,
        zip_code: input.address.zipCode,
        complement: input.address.complement ?? '',
      },
    },
    services: [{ name: input.description, description: input.description, amount: Math.round(input.amount * 100) }],
    payment_terms: { due_date: input.dueDate },
    payment_forms: ['BANK_SLIP', 'PIX'],
    ...(input.customerEmail
      ? {
          notification: {
            name: 'Cobrança',
            channels: [
              {
                channel: 'EMAIL',
                contact: input.customerEmail,
                rules: ['NOTIFY_WHEN_CREATED', 'NOTIFY_TWO_DAYS_BEFORE_DUE_DATE'],
              },
            ],
          },
        }
      : {}),
  };

  const { statusCode, body } = await authorizedRequest(credentials, '/v2/invoices', 'POST', payload);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Falha ao criar cobrança no Cora (status ${statusCode}): ${JSON.stringify(body)}`);
  }

  return mapInvoice(body);
}

export async function getCoraInvoice(credentials: CoraCredentials, invoiceId: string): Promise<CoraInvoice> {
  const { statusCode, body } = await authorizedRequest(credentials, `/v2/invoices/${invoiceId}`, 'GET');

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Falha ao consultar cobrança no Cora (status ${statusCode}): ${JSON.stringify(body)}`);
  }

  return mapInvoice(body);
}

export async function cancelCoraInvoice(
  credentials: CoraCredentials,
  invoiceId: string
): Promise<{ alreadyPaid: boolean }> {
  const { statusCode, body } = await authorizedRequest(credentials, `/v2/invoices/${invoiceId}`, 'DELETE');

  if (statusCode === 204 || statusCode === 200) {
    return { alreadyPaid: false };
  }

  if (statusCode === 422 && (body?.code === 'REC-0006' || /já foi pago/i.test(body?.message ?? ''))) {
    return { alreadyPaid: true };
  }

  throw new Error(`Falha ao cancelar cobrança no Cora (status ${statusCode}): ${JSON.stringify(body)}`);
}

export async function registerCoraWebhook(credentials: CoraCredentials, webhookUrl: string): Promise<string> {
  const { statusCode, body } = await authorizedRequest(credentials, '/endpoints', 'POST', {
    url: webhookUrl,
    resource: 'invoice',
    trigger: 'paid',
  });

  if (statusCode < 200 || statusCode >= 300 || !body?.id) {
    throw new Error(`Falha ao registrar webhook no Cora (status ${statusCode}): ${JSON.stringify(body)}`);
  }

  return body.id as string;
}

function mapInvoice(raw: any): CoraInvoice {
  // A Cora pode retornar os dados de boleto/pix aninhados (bank_slip/pix) ou nos campos
  // de topo (barcode/digitable/url/emv), dependendo da versão — checamos os dois formatos.
  const bankSlipSource = raw?.bank_slip ?? raw;
  const pixSource = raw?.pix ?? raw;

  return {
    id: raw?.id,
    code: raw?.code ?? undefined,
    status: raw?.status,
    totalAmount: raw?.total_amount,
    totalPaid: raw?.total_paid,
    bankSlip:
      bankSlipSource?.barcode || bankSlipSource?.digitable || bankSlipSource?.url
        ? { barcode: bankSlipSource.barcode, digitable: bankSlipSource.digitable, url: bankSlipSource.url }
        : undefined,
    pix: pixSource?.emv ? { emv: pixSource.emv } : undefined,
  };
}
