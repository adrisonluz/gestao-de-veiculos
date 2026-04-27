'use client';

import { useState } from 'react';
import { Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { updateAclProfile } from '@/lib/actions';
import { SYSTEM_AREAS } from '@/lib/rbac';
import type { AclProfile, PermissionSet, SystemAction, SystemArea, UserRole } from '@/lib/definitions';

const ACTION_LABELS: Record<SystemAction, string> = {
  read: 'Visualizar',
  create: 'Criar',
  update: 'Editar',
  delete: 'Excluir',
  export: 'Exportar',
};

export function ProfilePermissionEditor({
  profile,
  companyId,
  actorRole,
  onSaved,
}: {
  profile: AclProfile;
  companyId: string;
  actorRole: UserRole;
  onSaved: () => void;
}) {
  const [permissions, setPermissions] = useState<PermissionSet>(profile.permissions);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (area: SystemArea, action: SystemAction) => {
    setPermissions((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [action]: !prev[area]?.[action],
      },
    }));
    setSaved(false);
  };

  const toggleAllArea = (area: SystemArea) => {
    const areaActions = SYSTEM_AREAS[area].actions;
    const allEnabled = areaActions.every((a) => permissions[area]?.[a]);
    setPermissions((prev) => ({
      ...prev,
      [area]: Object.fromEntries(areaActions.map((a) => [a, !allEnabled])),
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAclProfile(companyId, actorRole, profile.id, {
        name: profile.name,
        description: profile.description,
        permissions,
      });
      setSaved(true);
      onSaved();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Área</th>
              {(['read', 'create', 'update', 'delete', 'export'] as SystemAction[]).map((action) => (
                <th key={action} className="px-3 py-3 text-center font-medium text-muted-foreground">
                  {ACTION_LABELS[action]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(SYSTEM_AREAS) as SystemArea[]).map((area, index) => {
              const config = SYSTEM_AREAS[area];
              const areaActions = config.actions;
              const allEnabled = areaActions.every((a) => permissions[area]?.[a]);

              return (
                <tr
                  key={area}
                  className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${index % 2 === 0 ? '' : 'bg-muted/10'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allEnabled}
                        onCheckedChange={() => toggleAllArea(area)}
                        disabled={profile.isSystem}
                        aria-label={`Selecionar tudo em ${config.label}`}
                      />
                      <span className="font-medium">{config.label}</span>
                    </div>
                  </td>
                  {(['read', 'create', 'update', 'delete', 'export'] as SystemAction[]).map((action) => {
                    const isAvailable = areaActions.includes(action);
                    return (
                      <td key={action} className="px-3 py-3 text-center">
                        {isAvailable ? (
                          <Checkbox
                            checked={permissions[area]?.[action] === true}
                            onCheckedChange={() => toggle(area, action)}
                            disabled={profile.isSystem}
                            aria-label={`${ACTION_LABELS[action]} em ${config.label}`}
                          />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {profile.isSystem ? (
        <Badge variant="secondary" className="text-xs">
          Perfis do sistema não podem ser editados
        </Badge>
      ) : (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Permissões'}
          </Button>
        </div>
      )}
    </div>
  );
}
