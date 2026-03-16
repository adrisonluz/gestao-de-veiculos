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
import type { UserRole } from '@/lib/definitions';

export function CreateVehicleModal({
  clientId,
  companyId,
  actorRole,
  disabled,
  onVehicleCreated,
}: {
  clientId: string;
  companyId: string;
  actorRole: UserRole;
  disabled?: boolean;
  onVehicleCreated?: () => Promise<void> | void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
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
        <CreateVehicleForm
          clientId={clientId}
          companyId={companyId}
          actorRole={actorRole}
          onSuccess={async () => {
            if (onVehicleCreated) {
              await onVehicleCreated();
            }
            setIsOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
