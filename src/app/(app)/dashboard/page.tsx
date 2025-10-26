
import { PageHeader } from '@/components/page-header';
import { DashboardClient } from './_components/dashboard-client';
import { fetchClients, getFinancialRecords } from '@/lib/data';

export default async function DashboardPage() {

  const clients = await fetchClients();
  const financialRecords = await getFinancialRecords();

  return (
    <>
      <PageHeader title="Painel" />
      <DashboardClient clients={clients} financialRecords={financialRecords} />
    </>
  );
}
