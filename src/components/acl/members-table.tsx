'use client';

import { useState } from 'react';
import { Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssignProfileModal } from './assign-profile-modal';
import type { AclProfile, CompanyMember, UserRole } from '@/lib/definitions';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  financial: 'Financeiro',
  viewer: 'Visualizador',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  invited: 'Convidado',
  disabled: 'Desativado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  invited: 'secondary',
  disabled: 'destructive',
};

export function MembersTable({
  members,
  profiles,
  companyId,
  actorRole,
  currentUserId,
  canManage,
  onRefresh,
}: {
  members: CompanyMember[];
  profiles: AclProfile[];
  companyId: string;
  actorRole: UserRole;
  currentUserId: string;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [assigningMember, setAssigningMember] = useState<CompanyMember | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Perfil de Acesso</TableHead>
            {canManage && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground py-8">
                Nenhum membro encontrado.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.membershipId}>
                <TableCell>
                  <div className="flex flex-col">
                    {member.displayName && (
                      <span className="font-medium">{member.displayName}</span>
                    )}
                    <span className={member.displayName ? 'text-xs text-muted-foreground' : 'font-medium'}>
                      {member.email || '(sem e-mail)'}
                    </span>
                    {member.userId === currentUserId && (
                      <Badge variant="outline" className="w-fit text-xs mt-1">Você</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="capitalize">{ROLE_LABELS[member.role] ?? member.role}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[member.status] ?? 'secondary'}>
                    {STATUS_LABELS[member.status] ?? member.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {member.aclProfileName ? (
                    <Badge variant="secondary">{member.aclProfileName}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Padrão (função)</span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssigningMember(member)}
                        title="Atribuir perfil de acesso"
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {assigningMember && (
        <AssignProfileModal
          member={assigningMember}
          profiles={profiles}
          companyId={companyId}
          actorRole={actorRole}
          open={!!assigningMember}
          onOpenChange={(open) => { if (!open) setAssigningMember(null); }}
          onSuccess={() => {
            setAssigningMember(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
