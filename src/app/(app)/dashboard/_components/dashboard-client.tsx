'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Users, Car } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Client, FinancialRecord } from '@/lib/definitions';

type DashboardClientProps = {
  clients: Client[];
  financialRecords: FinancialRecord[];
};

export function DashboardClient({ clients, financialRecords }: DashboardClientProps) {
  const totalClients = clients.length;
  const totalVehicles = clients.reduce((acc, client) => acc + client.vehicles.length, 0);

  const totalPago = financialRecords
    .filter((r) => r.status === 'Pago')
    .reduce((acc, r) => acc + r.amount, 0);
  const totalPendente = financialRecords
    .filter((r) => r.status === 'Em aberto' || r.status === 'Vencido')
    .reduce((acc, r) => acc + r.amount, 0);
  const totalRevenue = totalPago - totalPendente;

  const processChartData = (records: FinancialRecord[]) => {
    const monthlyRevenue: {
      [key: string]: {
        paid: number;
        open: number;
        overdue: number;
        canceled: number;
      };
    } = {};

    records.forEach((record) => {
      const date = new Date(record.date);
      const month = date.toLocaleString('pt-BR', { month: 'short' });

      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = {
          paid: 0,
          open: 0,
          overdue: 0,
          canceled: 0,
        };
      }

      if (record.amount <= 0) {
        return;
      }

      switch (record.status) {
        case 'Pago':
          monthlyRevenue[month].paid += record.amount;
          break;
        case 'Vencido':
          monthlyRevenue[month].overdue += record.amount;
          break;
        case 'Cancelado':
          monthlyRevenue[month].canceled += record.amount;
          break;
        case 'Em aberto':
        default:
          monthlyRevenue[month].open += record.amount;
          break;
      }
    });

    const chartData = Object.keys(monthlyRevenue).map((month) => ({
      name: month,
      Pago: monthlyRevenue[month].paid,
      'Em aberto': monthlyRevenue[month].open,
      Vencido: monthlyRevenue[month].overdue,
      Cancelado: monthlyRevenue[month].canceled,
    }));

    return chartData;
  };

  const chartData = processChartData(financialRecords);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRevenue < 0 ? 'text-red-500' : ''}`}>
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">
              Pago: {totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} &minus; Pendente: {totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">+2 novos este mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos Ativos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground">+5 novos este mês</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral da Receita</CardTitle>
            <CardDescription>Receita mensal dos últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value: number) =>
                    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                />
                <Tooltip
                  formatter={(value: number) =>
                    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }
                />
                <Legend />
                <Bar
                  dataKey="Pago"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Em aberto"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Vencido"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Cancelado"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
