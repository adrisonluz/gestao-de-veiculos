'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { CoraIntegrationCard } from '@/components/integrations/cora-integration-card';
import { fetchCoraIntegration } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import type { PaymentIntegration } from '@/lib/definitions';

export default function IntegrationsPage() {
  const { activeCompanyId, hasPermission } = useAuth();
  const [coraIntegration, setCoraIntegration] = useState<PaymentIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  const canRead = hasPermission('integrations', 'read');
  const canManage = hasPermission('integrations', 'create') || hasPermission('integrations', 'update');

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const integration = await fetchCoraIntegration(activeCompanyId);
      setCoraIntegration(integration);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Plug className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground mt-1">Você não tem permissão para ver as integrações.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Integrações" />
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : activeCompanyId ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CoraIntegrationCard
            companyId={activeCompanyId}
            integration={coraIntegration}
            canManage={canManage}
            onRefresh={load}
          />
        </div>
      ) : null}
    </>
  );
}
