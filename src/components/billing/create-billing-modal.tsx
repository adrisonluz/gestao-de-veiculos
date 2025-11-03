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
import { CreateBillingForm } from './create-billing-form';
import { DollarSign } from 'lucide-react';

export function CreateBillingModal({ client }: { client: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
          <DollarSign className="mr-2 h-4 w-4" />
          Gerar Cobrança
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerar Cobrança</DialogTitle>
          <DialogDescription>
            Preencha as informações da nova cobrança.
          </DialogDescription>
        </DialogHeader>
        <CreateBillingForm client={client} onSuccess={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
