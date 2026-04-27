"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchClientById } from '@/lib/data';
import { updateVehicle } from '@/lib/actions';
import type { Client, UploadedFile, Vehicle } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/page-header';
import { FileUploadSection } from '@/components/file-upload/file-upload-section';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CurrencyInputComponent } from '@/components/ui/currency-input';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  plate: z.string().min(7, 'A placa deve ter 7 caracteres.'),
  model: z.string().min(2, 'O modelo deve ter pelo menos 2 caracteres.'),
  brand: z.string().min(2, 'A marca deve ter pelo menos 2 caracteres.'),
  year: z.string().min(4, 'O ano deve ter 4 caracteres.'),
  color: z.string().min(3, 'A cor deve ter pelo menos 3 caracteres.'),
  value: z.coerce.number().min(0, 'O valor deve ser um número positivo.'),
});

export default function VehiclePage() {
  const params = useParams<{ id: string; vehicleId: string }>();
  const router = useRouter();
  const { activeCompanyId, activeRole, hasPermission } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plate: '',
      model: '',
      brand: '',
      year: '',
      color: '',
      value: 0,
    },
  });

  const loadData = useCallback(async () => {
    if (!activeCompanyId || !params?.id || !params?.vehicleId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const foundClient = await fetchClientById(activeCompanyId, params.id);
      if (!foundClient) { setLoading(false); return; }

      const foundVehicle = foundClient.vehicles.find((v) => v.id === params.vehicleId) ?? null;

      setClient(foundClient);
      setVehicle(foundVehicle);

      if (foundVehicle) {
        form.reset({
          plate: foundVehicle.plate,
          model: foundVehicle.model,
          brand: foundVehicle.brand ?? '',
          year: foundVehicle.year ?? '',
          color: foundVehicle.color ?? '',
          value: foundVehicle.value,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, params?.id, params?.vehicleId, form]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeCompanyId || !activeRole || !params?.id || !params?.vehicleId) return;
    await updateVehicle(activeCompanyId, activeRole, params.id, params.vehicleId, values);
    setVehicle((prev) => prev ? { ...prev, ...values } : prev);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }

  async function handleFileAdded(file: UploadedFile) {
    if (!params?.id || !params?.vehicleId) return;
    const vehicleRef = doc(db, 'clients', params.id, 'vehicles', params.vehicleId);
    await updateDoc(vehicleRef, { files: arrayUnion(file) });
    setVehicle((prev) => prev ? { ...prev, files: [...prev.files, file] } : prev);
  }

  async function handleFileDeleted(file: UploadedFile) {
    if (!params?.id || !params?.vehicleId) return;
    const vehicleRef = doc(db, 'clients', params.id, 'vehicles', params.vehicleId);
    await updateDoc(vehicleRef, { files: arrayRemove(file) });
    setVehicle((prev) =>
      prev ? { ...prev, files: prev.files.filter((f) => f.path !== file.path) } : prev
    );
  }

  if (loading) {
    return <PageHeader title="Carregando veículo..." />;
  }

  if (!vehicle || !client || !activeCompanyId || !activeRole) {
    return <PageHeader title="Veículo não encontrado" />;
  }

  const canEdit = hasPermission('vehicles', 'update');

  return (
    <>
      <div className="mb-2">
        <Link
          href={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {client.name}
        </Link>
      </div>

      <PageHeader title={`${vehicle.plate} — ${vehicle.model}`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Veículo</CardTitle>
              <CardDescription>Edite os dados cadastrais do veículo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="plate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa</FormLabel>
                          <FormControl>
                            <Input placeholder="ABC-1234" disabled={!canEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota" disabled={!canEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input placeholder="Corolla" disabled={!canEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                            <CurrencyInputComponent
                              value={field.value ?? 0}
                              placeholder="R$ 0,00"
                              disabled={!canEdit}
                              onValueChange={(maskedValue) => {
                                const parsed = maskedValue ? Number(maskedValue) : 0;
                                field.onChange(Number.isNaN(parsed) ? 0 : parsed);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano</FormLabel>
                          <FormControl>
                            <Input placeholder="2023" disabled={!canEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor</FormLabel>
                          <FormControl>
                            <Input placeholder="Preto" disabled={!canEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                      </Button>
                      {saveSuccess && (
                        <span className="text-sm text-green-600">Salvo com sucesso!</span>
                      )}
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Arquivos</CardTitle>
              <CardDescription>
                Fotos, documentos e comprovantes do veículo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploadSection
                files={vehicle.files}
                storagePath={`companies/${activeCompanyId}/clients/${client.id}/vehicles/${vehicle.id}`}
                onFileAdded={handleFileAdded}
                onFileDeleted={handleFileDeleted}
                disabled={!canEdit}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
