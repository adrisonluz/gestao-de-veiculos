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
  const totalRevenue = financialRecords.reduce((acc, record) => acc + (record.amount > 0 ? record.amount : 0), 0);

  const processChartData = (records: FinancialRecord[]) => {
    const monthlyRevenue: { [key: string]: number } = {};

    records.forEach((record) => {
      const date = new Date(record.date);
      const month = date.toLocaleString('pt-BR', { month: 'short' });

      if (record.amount > 0) {
        if (monthlyRevenue[month]) {
          monthlyRevenue[month] += record.amount;
        } else {
          monthlyRevenue[month] = record.amount;
        }
      }
    });

    const chartData = Object.keys(monthlyRevenue).map((month) => ({
      name: month,
      revenue: monthlyRevenue[month],
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
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-xs text-muted-foreground">+20.1% do último mês</p>
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
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
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
