
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

export default async function ReportsPage() {
  const clients = await fetchClients();
  const financialRecords = await getFinancialRecords();

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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input type="date" placeholder="Data Inicial" />
            <Input type="date" placeholder="Data Final" />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {financialRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{clients.find(c => c.id === record.clientId)?.name}</TableCell>
                  <TableCell>{(record as any).vehiclePlate || 'N/A'}</TableCell>
                  <TableCell className={`text-right font-medium ${record.amount < 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {record.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
