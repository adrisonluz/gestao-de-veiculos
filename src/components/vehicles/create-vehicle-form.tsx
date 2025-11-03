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
import { createVehicle } from '@/lib/actions';

const formSchema = z.object({
  plate: z.string().min(7, 'A placa deve ter 7 caracteres.'),
  model: z.string().min(2, 'O modelo deve ter pelo menos 2 caracteres.'),
  brand: z.string().min(2, 'A marca deve ter pelo menos 2 caracteres.'),
  year: z.string().min(4, 'O ano deve ter 4 caracteres.'),
  color: z.string().min(3, 'A cor deve ter pelo menos 3 caracteres.'),
  value: z.coerce.number().min(0, 'O valor deve ser um número positivo.'),
});

export function CreateVehicleForm({ clientId, onSuccess }: { clientId: string, onSuccess: () => void }) {
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createVehicle(clientId, values);
      onSuccess();
    } catch (error) {
      // TODO: Handle error with a toast notification
      console.error(error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="plate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placa</FormLabel>
              <FormControl>
                <Input placeholder="ABC-1234" {...field} />
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
                <Input placeholder="Corolla" {...field} />
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
                <Input placeholder="Toyota" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex w-full space-x-4">
            <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
                <FormItem className="w-full">
                <FormLabel>Ano</FormLabel>
                <FormControl>
                    <Input placeholder="2023" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
                <FormItem className="w-full">
                <FormLabel>Cor</FormLabel>
                <FormControl>
                    <Input placeholder="Preto" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="50000" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Veículo'}
        </Button>
      </form>
    </Form>
  );
}
