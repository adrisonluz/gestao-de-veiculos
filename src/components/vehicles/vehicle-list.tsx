'use client';

import Link from 'next/link';
import type { Vehicle } from '@/lib/definitions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { deleteVehicle } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

type VehicleListProps = {
  vehicles: Vehicle[];
  clientId?: string;
  onVehicleDeleted?: (vehicleId: string) => void;
};

export function VehicleList({ vehicles, clientId, onVehicleDeleted }: VehicleListProps) {
  const { activeCompanyId, activeRole, activeAclProfile } = useAuth();

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!clientId || !activeCompanyId || !activeRole) return;
    const confirmed = window.confirm('Tem certeza que deseja excluir este veículo?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteVehicle(activeCompanyId, activeRole, activeAclProfile?.id ?? null, clientId, vehicleId);
      onVehicleDeleted?.(vehicleId);
    } catch (error) {
      console.error(error);
      window.alert('Não foi possível excluir o veículo. Tente novamente.');
    }
  };

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Placa</TableHead>
          <TableHead>Modelo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => (
          <TableRow key={vehicle.id}>
            <TableCell className="font-medium">
              {clientId ? (
                <Link
                  href={`/clients/${clientId}/vehicles/${vehicle.id}`}
                  className="hover:underline"
                >
                  {vehicle.plate}
                </Link>
              ) : (
                vehicle.plate
              )}
            </TableCell>
            <TableCell>{vehicle.model}</TableCell>
            <TableCell className="text-right">
              {vehicle.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {clientId && (
                    <DropdownMenuItem asChild>
                      <Link href={`/clients/${clientId}/vehicles/${vehicle.id}`}>
                        Ver detalhes
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => void handleDeleteVehicle(vehicle.id)}
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
