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
import { assignAclProfile } from '@/lib/actions';
import type { AclProfile, CompanyMember, UserRole } from '@/lib/definitions';

const NO_PROFILE_VALUE = '__none__';

export function AssignProfileModal({
  member,
  profiles,
  companyId,
  actorRole,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: CompanyMember;
  profiles: AclProfile[];
  companyId: string;
  actorRole: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    member.aclProfileId ?? NO_PROFILE_VALUE
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await assignAclProfile(
        companyId,
        actorRole,
        member.membershipId,
        selectedProfileId === NO_PROFILE_VALUE ? null : selectedProfileId
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Perfil de Acesso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Membro: <span className="font-medium text-foreground">{member.email}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Função: <span className="font-medium text-foreground capitalize">{member.role}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso personalizado</Label>
            <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um perfil..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROFILE_VALUE}>
                  Nenhum (usa permissões da função)
                </SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quando um perfil personalizado é atribuído, ele substitui as permissões padrão da função do usuário.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
