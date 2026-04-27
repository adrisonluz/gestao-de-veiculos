'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { formatDateForInput } from '@/lib/input-masks';
import { createBilling } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  vehicleId: z.string().optional(),
  dueDate: z.string(),
  value: z.coerce.number(),
  status: z.enum(['Em aberto', 'Vencido', 'Pago', 'Cancelado']),
});

export function CreateBillingForm({
  companyId,
  client,
  onSuccess,
}: {
  companyId: string;
  client: any;
  onSuccess: () => Promise<void> | void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(10);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: undefined,
      dueDate: formatDateForInput(nextMonth),
      value: 0,
      status: 'Em aberto',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!activeRole) return;
    try {
      await createBilling(companyId, activeRole, activeAclProfile?.id ?? null, client.id, values);
      await onSuccess();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {client.vehicles?.length > 0 && (
          <FormField
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Veículo</FormLabel>
                <Select
                  onValueChange={(vehicleId) => {
                    field.onChange(vehicleId);
                    const vehicle = client.vehicles.find((v: any) => v.id === vehicleId);
                    if (vehicle) {
                      form.setValue('value', vehicle.value);
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o veículo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {client.vehicles.map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} — {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vencimento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
          name="status"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Em aberto">Em aberto</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                        <SelectItem value="Pago">Pago</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Cobrança'}
        </Button>
      </form>
    </Form>
  );
}
