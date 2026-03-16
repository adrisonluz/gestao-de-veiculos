'use client';

import { useState } from 'react';
import { AlertCircle, Building2 } from 'lucide-react';

import { createInitialCompany } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CompanyOnboardingAlert() {
  const { user, reloadTenantContext } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCompany = async () => {
    if (!user) {
      return;
    }

    if (!companyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe um nome para a sua empresa.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createInitialCompany({
        userId: user.uid,
        name: companyName.trim(),
      });

      await reloadTenantContext();

      toast({
        title: 'Empresa criada',
        description: 'Sua empresa foi criada e vinculada ao seu usuário.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar empresa',
        description: 'Não foi possível criar sua empresa. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4">
      <Alert className="border-primary/30">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Você ainda não está em nenhuma empresa</AlertTitle>
        <AlertDescription>
          <p className="mb-4">
            Para começar a usar o sistema, crie sua empresa. Seu usuário será definido como <strong>owner</strong>.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Nome da empresa"
              maxLength={80}
            />
            <Button onClick={handleCreateCompany} disabled={isSubmitting} className="sm:w-auto">
              <Building2 className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Criando...' : 'Criar empresa'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}