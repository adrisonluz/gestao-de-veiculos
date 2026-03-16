
"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { DashboardClient } from './_components/dashboard-client';
import { fetchClients, getFinancialRecords } from '@/lib/data';
import type { Client, FinancialRecord } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { activeCompanyId } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);

  useEffect(() => {
    if (!activeCompanyId) {
      setClients([]);
      setFinancialRecords([]);
      return;
    }

    const loadData = async () => {
      const [loadedClients, loadedFinancialRecords] = await Promise.all([
        fetchClients(activeCompanyId),
        getFinancialRecords(activeCompanyId),
      ]);
      setClients(loadedClients);
      setFinancialRecords(loadedFinancialRecords);
    };

    void loadData();
  }, [activeCompanyId]);

  return (
    <>
      <PageHeader title="Painel" />
      <DashboardClient clients={clients} financialRecords={financialRecords} />
    </>
  );
}
