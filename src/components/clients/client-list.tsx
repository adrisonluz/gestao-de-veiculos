'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Client } from '@/lib/definitions';

type ClientListProps = {
  clients: Client[];
};

export function ClientList({ clients }: ClientListProps) {
  const router = useRouter();

  const handleViewDetails = (clientId: string) => {
    router.push(`/clients/${clientId}`);
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Cobrança</TableHead>
          <TableHead className="text-right">Veículos</TableHead>
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className="cursor-pointer" onClick={() => handleViewDetails(client.id)}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell>{client.cpf}</TableCell>
            <TableCell>
              <Badge variant={client.billingType === 'automatic' ? 'default' : 'secondary'}>
                {client.billingType === 'automatic' ? 'Automática' : 'Manual'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{client.vehicles.length}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(client.id); }}>
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
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
