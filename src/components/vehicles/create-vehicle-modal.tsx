'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateVehicleForm } from './create-vehicle-form';
import { PlusCircle } from 'lucide-react';

export function CreateVehicleModal({ clientId }: { clientId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Veículo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Veículo</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo veículo.
          </DialogDescription>
        </DialogHeader>
        <CreateVehicleForm clientId={clientId} onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
