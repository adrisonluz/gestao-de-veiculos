'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyCepMask } from '@/lib/input-masks';
import { updateClientAddress } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import type { ClientAddress } from '@/lib/definitions';

export function EditAddressModal({
  companyId,
  clientId,
  address,
  open,
  onOpenChange,
  onSuccess,
}: {
  companyId: string;
  clientId: string;
  address: ClientAddress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (address: ClientAddress) => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [form, setForm] = useState<ClientAddress>(address);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof ClientAddress, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!activeRole) return;
    setSaving(true);
    setError(null);
    try {
      await updateClientAddress(companyId, activeRole, activeAclProfile?.id ?? null, clientId, form);
      onOpenChange(false);
      onSuccess(form);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar endereço.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Endereço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CEP</Label>
              <Input
                value={form.zipCode}
                maxLength={9}
                onChange={(e) => update('zipCode', applyCepMask(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input
                value={form.state}
                maxLength={2}
                onChange={(e) => update('state', e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={form.district} onChange={(e) => update('district', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Rua</Label>
              <Input value={form.street} onChange={(e) => update('street', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.number} onChange={(e) => update('number', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Complemento (opcional)</Label>
            <Input value={form.complement ?? ''} onChange={(e) => update('complement', e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
