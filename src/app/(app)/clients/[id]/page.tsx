
"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchClientById, getFinancialRecords } from '@/lib/data';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateVehicleModal } from '@/components/vehicles/create-vehicle-modal';
import { VehicleList } from '@/components/vehicles/vehicle-list';
import { CreateBillingModal } from '@/components/billing/create-billing-modal';
import type { Client, FinancialRecord } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeCompanyId, activeRole, hasPermission } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [billingRecords, setBillingRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClient = useCallback(async () => {
    if (!activeCompanyId || !params?.id) {
      setClient(null);
      setBillingRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [foundClient, records] = await Promise.all([
        fetchClientById(activeCompanyId, params.id),
        getFinancialRecords(activeCompanyId),
      ]);
      setClient(foundClient);
      setBillingRecords(records.filter((record) => record.clientId === params.id));
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, params?.id]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  if (loading) {
    return <PageHeader title="Carregando cliente..." />;
  }

  if (!client || !activeCompanyId || !activeRole) {
    return <PageHeader title="Cliente não encontrado" />;
  }

  return (
    <>
      <PageHeader title={client.name} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPF</p>
                <p>{client.cpf}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                <p>{client.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cobrança</p>
                <Badge variant={client.billingType === 'automatic' ? 'default' : 'secondary'}>
                  {client.billingType === 'automatic' ? 'Automática' : 'Manual'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Veículos</CardTitle>
                <CardDescription>
                  Veículos registrados para {client.name}.
                </CardDescription>
              </div>
              <CreateVehicleModal
                clientId={client.id}
                companyId={activeCompanyId}
                actorRole={activeRole}
                disabled={!hasPermission('vehicles', 'create')}
                onVehicleCreated={loadClient}
              />
            </CardHeader>
            <CardContent>
              <VehicleList vehicles={client.vehicles} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financeiro</CardTitle>
                <CardDescription>
                  Lista de cobranças de {client.name}.
                </CardDescription>
              </div>
              <CreateBillingModal
                companyId={activeCompanyId}
                actorRole={activeRole}
                client={client}
                disabled={!hasPermission('billing', 'create')}
                onBillingCreated={loadClient}
              />
            </CardHeader>
            <CardContent>
              {billingRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cobrança encontrada para este cliente.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date.toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="text-right">
                          {record.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
