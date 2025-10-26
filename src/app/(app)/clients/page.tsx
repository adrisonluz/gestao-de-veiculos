
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ClientList } from '@/components/clients/client-list';
import { PageHeader } from '@/components/page-header';
import { fetchClients } from '@/lib/data';
import { PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Client } from '@/lib/definitions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CreateClientForm } from '@/components/clients/create-client-form';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadClients() {
      const fetchedClients = await fetchClients();
      setClients(fetchedClients);
    }
    loadClients();
  }, []);

  const handleClientCreated = () => {
    async function loadClients() {
      const fetchedClients = await fetchClients();
      setClients(fetchedClients);
    }
    loadClients();
    setIsModalOpen(false);
  };

  return (
    <>
      <PageHeader title="Clientes">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <CreateClientForm onSuccess={handleClientCreated} />
          </DialogContent>
        </Dialog>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Clientes</CardTitle>
          <CardDescription>
            Uma lista de todos os clientes em seu sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientList clients={clients} />
        </CardContent>
      </Card>
    </>
  );
}
