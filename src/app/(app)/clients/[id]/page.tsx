
"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchClientById, getFinancialRecords } from '@/lib/data';
import { updateBillingStatus } from '@/lib/actions';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateVehicleModal } from '@/components/vehicles/create-vehicle-modal';
import { VehicleList } from '@/components/vehicles/vehicle-list';
import { CreateBillingModal } from '@/components/billing/create-billing-modal';
import { FileUploadSection } from '@/components/file-upload/file-upload-section';
import type { Client, FinancialRecord, UploadedFile } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUS_OPTIONS = ['Em aberto', 'Vencido', 'Pago', 'Cancelado'] as const;
type BillingStatus = typeof STATUS_OPTIONS[number];

const statusBadgeVariant: Record<BillingStatus, string> = {
  'Pago': 'bg-green-100 text-green-800',
  'Em aberto': 'bg-blue-100 text-blue-800',
  'Vencido': 'bg-amber-100 text-amber-800',
  'Cancelado': 'bg-red-100 text-red-800',
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeCompanyId, activeRole, activeAclProfile, hasPermission } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [billingRecords, setBillingRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingBillingId, setUpdatingBillingId] = useState<string | null>(null);

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

  async function handleStatusChange(recordId: string, newStatus: BillingStatus) {
    if (!activeCompanyId || !activeRole) return;
    setUpdatingBillingId(recordId);
    try {
      await updateBillingStatus(activeCompanyId, activeRole, activeAclProfile?.id ?? null, recordId, newStatus);
      setBillingRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingBillingId(null);
    }
  }

  async function handleDocumentAdded(file: UploadedFile) {
    if (!params?.id) return;
    const clientRef = doc(db, 'clients', params.id);
    await updateDoc(clientRef, { documents: arrayUnion(file) });
    setClient((prev) => prev ? { ...prev, documents: [...prev.documents, file] } : prev);
  }

  async function handleDocumentDeleted(file: UploadedFile) {
    if (!params?.id) return;
    const clientRef = doc(db, 'clients', params.id);
    await updateDoc(clientRef, { documents: arrayRemove(file) });
    setClient((prev) =>
      prev ? { ...prev, documents: prev.documents.filter((d) => d.path !== file.path) } : prev
    );
  }

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
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPF</p>
                <p>{client.cpf}</p>
              </div>
              {client.email && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{client.email}</p>
                </div>
              )}
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

          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>CNH, comprovantes e demais arquivos do cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadSection
                files={client.documents}
                storagePath={`companies/${activeCompanyId}/clients/${client.id}`}
                onFileAdded={handleDocumentAdded}
                onFileDeleted={handleDocumentDeleted}
                disabled={!hasPermission('clients', 'update')}
              />
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
                disabled={!hasPermission('vehicles', 'create')}
                onVehicleCreated={loadClient}
              />
            </CardHeader>
            <CardContent>
              <VehicleList
                vehicles={client.vehicles}
                clientId={client.id}
              />
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
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date.toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {record.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={(record.status as BillingStatus) ?? 'Em aberto'}
                            onValueChange={(val) => void handleStatusChange(record.id, val as BillingStatus)}
                            disabled={updatingBillingId === record.id || !hasPermission('billing', 'update')}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
