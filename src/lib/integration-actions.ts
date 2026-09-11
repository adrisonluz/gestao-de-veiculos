'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { checkPermission } from './actions';
import { encryptSecret } from './crypto';
import { testCoraCredentials, registerCoraWebhook, type CoraCredentials } from './integrations/cora-client';
import type { UserRole } from './definitions';

const CoraConfigSchema = z.object({
  environment: z.enum(['sandbox', 'production']),
  clientId: z.string().min(1),
  certificate: z.string().min(1),
  privateKey: z.string().min(1),
});

function getCoraIntegrationDocId(companyId: string): string {
  return `${companyId}_cora`;
}

export async function saveCoraIntegration(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined,
  data: z.infer<typeof CoraConfigSchema>
): Promise<{ enabled: boolean; lastError: string | null }> {
  const canCreate = await checkPermission(companyId, actorRole, aclProfileId, 'integrations', 'create');
  const canUpdate = await checkPermission(companyId, actorRole, aclProfileId, 'integrations', 'update');
  if (!canCreate && !canUpdate) {
    throw new Error('Permissão insuficiente para configurar integrações.');
  }

  const parsed = CoraConfigSchema.parse(data);
  const integrationRef = doc(db, 'payment_integrations', getCoraIntegrationDocId(companyId));
  const existingSnap = await getDoc(integrationRef);
  const existingData = existingSnap.exists() ? existingSnap.data() : null;

  const credentials: CoraCredentials = {
    environment: parsed.environment,
    clientId: parsed.clientId,
    certificate: parsed.certificate,
    privateKey: parsed.privateKey,
  };

  let webhookEndpointId: string | undefined = existingData?.webhookEndpointId ?? undefined;
  let lastError: string | null = null;
  let enabled = false;

  try {
    await testCoraCredentials(credentials);

    if (!webhookEndpointId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      webhookEndpointId = await registerCoraWebhook(credentials, `${appUrl}/api/webhooks/cora/${companyId}`);
    }

    enabled = true;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Erro desconhecido ao validar credenciais.';
  }

  await setDoc(integrationRef, {
    companyId,
    provider: 'cora',
    environment: parsed.environment,
    enabled,
    credentials: encryptSecret(
      JSON.stringify({ clientId: parsed.clientId, certificate: parsed.certificate, privateKey: parsed.privateKey })
    ),
    webhookEndpointId: webhookEndpointId ?? null,
    lastValidatedAt: enabled ? serverTimestamp() : existingData?.lastValidatedAt ?? null,
    lastError,
    createdAt: existingData?.createdAt ?? serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: existingData?.createdBy ?? '',
  });

  revalidatePath('/settings/integrations');

  return { enabled, lastError };
}

export async function deleteCoraIntegration(
  companyId: string,
  actorRole: UserRole,
  aclProfileId: string | null | undefined
): Promise<void> {
  if (!await checkPermission(companyId, actorRole, aclProfileId, 'integrations', 'delete')) {
    throw new Error('Permissão insuficiente para remover integrações.');
  }

  await deleteDoc(doc(db, 'payment_integrations', getCoraIntegrationDocId(companyId)));
  revalidatePath('/settings/integrations');
}
