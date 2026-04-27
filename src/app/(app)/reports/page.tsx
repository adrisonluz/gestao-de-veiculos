
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
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecord[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');

  useEffect(() => {
    if (!activeCompanyId) {
      setClients([]);
      setFinancialRecords([]);
      setFilteredRecords([]);
      return;
    }

    const loadData = async () => {
      const [loadedClients, loadedRecords] = await Promise.all([
        fetchClients(activeCompanyId),
        getFinancialRecords(activeCompanyId),
      ]);
      setClients(loadedClients);
      setFinancialRecords(loadedRecords);
      setFilteredRecords(loadedRecords);
    };

    void loadData();
  }, [activeCompanyId]);

  function applyFilters() {
    let result = [...financialRecords];

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      result = result.filter((r) => r.date >= start);
    }

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      result = result.filter((r) => r.date <= end);
    }

    if (selectedClientId) {
      result = result.filter((r) => r.clientId === selectedClientId);
    }

    if (selectedStatus) {
      result = result.filter((r) => (r.status ?? 'Em aberto') === selectedStatus);
    }

    if (vehiclePlate.trim()) {
      const plate = vehiclePlate.trim().toLowerCase();
      const clientsWithPlate = clients
        .filter((c) => c.vehicles.some((v) => v.plate.toLowerCase().includes(plate)))
        .map((c) => c.id);
      result = result.filter((r) => clientsWithPlate.includes(r.clientId));
    }

    setFilteredRecords(result);
  }

  function clearFilters() {
    setStartDate('');
    setEndDate('');
    setSelectedClientId('');
    setSelectedStatus('');
    setVehiclePlate('');
    setFilteredRecords(financialRecords);
  }

  async function handleStatusChange(recordId: string, newStatus: BillingStatus) {
    if (!activeCompanyId || !activeRole) return;
    setUpdatingId(recordId);
    try {
      await updateBillingStatus(activeCompanyId, activeRole, recordId, newStatus);
      const update = (prev: FinancialRecord[]) =>
        prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r));
      setFinancialRecords(update);
      setFilteredRecords(update);
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
            Filtre os registros financeiros por período, cliente, status ou placa do veículo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Input
              type="date"
              aria-label="Data Inicial"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              aria-label="Data Final"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status" />
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
            <Input
              placeholder="Placa do Veículo"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={applyFilters}>Aplicar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>{filteredRecords.length} registro(s) encontrado(s)</CardDescription>
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
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{clients.find((c) => c.id === record.clientId)?.name}</TableCell>
                  <TableCell>{(record as any).vehiclePlate || 'N/A'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {record.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={(record.status as BillingStatus) ?? 'Em aberto'}
                      onValueChange={(val) => void handleStatusChange(record.id, val as BillingStatus)}
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
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum registro encontrado para os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
