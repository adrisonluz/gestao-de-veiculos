'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reissueBilling } from '@/lib/actions';
import { formatDateForInput } from '@/lib/input-masks';
import { useAuth } from '@/hooks/use-auth';
import type { FinancialRecord } from '@/lib/definitions';

function defaultReissueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return formatDateForInput(date);
}

export function ReissueBillingModal({
  companyId,
  record,
  onSuccess,
}: {
  companyId: string;
  record: FinancialRecord;
  onSuccess: () => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState(defaultReissueDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!activeRole) return;
    setSaving(true);
    setError(null);
    try {
      await reissueBilling(companyId, activeRole, activeAclProfile?.id ?? null, record.id, dueDate);
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao emitir nova via.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <RefreshCw className="mr-1 h-3.5 w-3.5" />
          Nova via
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir Nova Via</DialogTitle>
          <DialogDescription>
            Cancela esta cobrança (inclusive o boleto/pix no Cora, se houver) e cria uma nova com o vencimento
            abaixo, reenviando a cobrança para o cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reissue-due-date">Novo vencimento</Label>
          <Input id="reissue-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Emitindo...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
