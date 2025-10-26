
import { fetchClientById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { VehicleList } from '@/components/vehicles/vehicle-list';
import { Badge } from '@/components/ui/badge';

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await fetchClientById(params.id);

  if (!client) {
    notFound();
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
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Veículos</CardTitle>
                <CardDescription>
                  Veículos registrados para {client.name}.
                </CardDescription>
              </div>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Veículo
              </Button>
            </CardHeader>
            <CardContent>
              <VehicleList vehicles={client.vehicles} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
