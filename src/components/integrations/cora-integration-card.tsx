'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Landmark } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CoraConfigModal } from './cora-config-modal';
import { deleteCoraIntegration } from '@/lib/integration-actions';
import { useAuth } from '@/hooks/use-auth';
import type { PaymentIntegration } from '@/lib/definitions';

export function CoraIntegrationCard({
  companyId,
  integration,
  canManage,
  onRefresh,
}: {
  companyId: string;
  integration: PaymentIntegration | null;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!activeRole) return;
    setRemoving(true);
    try {
      await deleteCoraIntegration(companyId, activeRole, activeAclProfile?.id ?? null);
      onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Banco Cora</CardTitle>
            <CardDescription>Boleto, Pix e boleto-Pix com baixa automática.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!integration ? (
          <Badge variant="outline">Não configurado</Badge>
        ) : integration.enabled ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Conectado — {integration.environment === 'production' ? 'Produção' : 'Sandbox'}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              Falha na conexão
            </div>
            {integration.lastError && <p className="text-xs text-muted-foreground">{integration.lastError}</p>}
          </div>
        )}
      </CardContent>
      {canManage && (
        <CardFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            {integration ? 'Reconfigurar' : 'Configurar'}
          </Button>
          {integration && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive" disabled={removing}>
                  Remover
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover integração com o Cora?</AlertDialogTitle>
                  <AlertDialogDescription>
                    As cobranças já criadas continuam existindo, mas novas cobranças não serão mais enviadas ao Cora.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardFooter>
      )}

      {modalOpen && (
        <CoraConfigModal
          companyId={companyId}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={onRefresh}
        />
      )}
    </Card>
  );
}
