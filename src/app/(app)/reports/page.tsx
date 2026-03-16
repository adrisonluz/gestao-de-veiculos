
"use client";

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchClients, getFinancialRecords } from '@/lib/data';
import type { Client, FinancialRecord } from '@/lib/definitions';
import { updateBillingStatus } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

const STATUS_OPTIONS = ['Em aberto', 'Vencido', 'Pago', 'Cancelado'] as const;
type BillingStatus = typeof STATUS_OPTIONS[number];

const statusBadgeVariant: Record<BillingStatus, string> = {
  'Pago': 'bg-green-100 text-green-800',
  'Em aberto': 'bg-blue-100 text-blue-800',
  'Vencido': 'bg-amber-100 text-amber-800',
  'Cancelado': 'bg-red-100 text-red-800',
};

export default function ReportsPage() {
  const { activeCompanyId, activeRole } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  async function handleStatusChange(recordId: string, newStatus: BillingStatus) {
    if (!activeCompanyId || !activeRole) return;
    setUpdatingId(recordId);
    try {
      await updateBillingStatus(activeCompanyId, activeRole, recordId, newStatus);
      setFinancialRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <PageHeader title="Relatórios Financeiros" />
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
          <CardDescription>
            Filtre os registros financeiros por período, cliente ou placa do veículo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            <Input type="date" aria-label="Data Inicial" />
            <Input type="date" aria-label="Data Final" />
            <Input type="time" step="60" aria-label="Hora Inicial" />
            <Input type="time" step="60" aria-label="Hora Final" />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Placa do Veículo" />
          </div>
          <div className="mt-4 flex justify-end">
            <Button>Aplicar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Placa do Veículo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{clients.find(c => c.id === record.clientId)?.name}</TableCell>
                  <TableCell>{(record as any).vehiclePlate || 'N/A'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {record.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={(record.status as BillingStatus) ?? 'Em aberto'}
                      onValueChange={(val) => handleStatusChange(record.id, val as BillingStatus)}
                      disabled={updatingId === record.id}
                    >
                      <SelectTrigger className="h-8 w-36">
                        <SelectValue>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusBadgeVariant[(record.status as BillingStatus) ?? 'Em aberto'] ?? ''
                          }`}>
                            {record.status ?? 'Em aberto'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeVariant[s]}`}>
                              {s}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
