'use client';

import Image from 'next/image';
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
import type { Vehicle } from '@/lib/definitions';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type VehicleListProps = {
  vehicles: Vehicle[];
};

export function VehicleList({ vehicles }: VehicleListProps) {
  const getImage = (imageId: string) => {
    return PlaceHolderImages.find(p => p.id === imageId);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagem</TableHead>
          <TableHead>Placa</TableHead>
          <TableHead>Modelo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((vehicle) => {
          const image = getImage(vehicle.images[0]);
          return (
            <TableRow key={vehicle.id}>
              <TableCell>
                {image && (
                  <Image
                    src={image.imageUrl}
                    alt={vehicle.model}
                    width={64}
                    height={48}
                    className="rounded-md object-cover"
                    data-ai-hint={image.imageHint}
                  />
                )}
              </TableCell>
              <TableCell className="font-medium">{vehicle.plate}</TableCell>
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
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
