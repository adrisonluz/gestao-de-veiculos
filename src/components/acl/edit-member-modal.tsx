'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { updateMemberRole, updateMemberStatus } from '@/lib/actions';
import type { CompanyMember, UserRole } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';

type MemberStatus = 'active' | 'disabled';

export function EditMemberModal({
  member,
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: CompanyMember;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [status, setStatus] = useState<MemberStatus>(member.status === 'disabled' ? 'disabled' : 'active');
  const [role, setRole] = useState<UserRole>(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChangeRole = activeRole === 'owner';

  const handleSave = async () => {
    if (!activeRole) return;
    setSaving(true);
    setError(null);
    try {
      if (canChangeRole && role !== member.role) {
        await updateMemberRole(companyId, activeRole, activeAclProfile?.id ?? null, member.membershipId, role);
      }
      if (status !== member.status) {
        await updateMemberStatus(companyId, activeRole, activeAclProfile?.id ?? null, member.membershipId, status);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao atualizar membro.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Membro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Membro: <span className="font-medium text-foreground">{member.email}</span>
          </p>

          {canChangeRole && (
            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membro</SelectItem>
                  <SelectItem value="owner">Proprietário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MemberStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="disabled">Desativado</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Um membro desativado perde o acesso à empresa, mas não é removido.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
