'use client';

import { useState } from 'react';
import { Mail, Pencil, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssignProfileModal } from './assign-profile-modal';
import { EditMemberModal } from './edit-member-modal';
import { ResendInviteDialog } from './resend-invite-dialog';
import { removeMember } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import type { AclProfile, CompanyMember } from '@/lib/definitions';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  member: 'Membro',
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

function formatRelativeDays(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'hoje';
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export function MembersTable({
  members,
  profiles,
  companyId,
  currentUserId,
  canAssignProfile,
  canEdit,
  canRemove,
  onRefresh,
}: {
  members: CompanyMember[];
  profiles: AclProfile[];
  companyId: string;
  currentUserId: string;
  canAssignProfile: boolean;
  canEdit: boolean;
  canRemove: boolean;
  onRefresh: () => void;
}) {
  const canManage = canAssignProfile || canEdit || canRemove;
  const { activeRole, activeAclProfile } = useAuth();
  const [assigningMember, setAssigningMember] = useState<CompanyMember | null>(null);
  const [editingMember, setEditingMember] = useState<CompanyMember | null>(null);
  const [resendingMember, setResendingMember] = useState<CompanyMember | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (member: CompanyMember) => {
    if (!activeRole) return;
    setRemovingId(member.membershipId);
    try {
      await removeMember(companyId, activeRole, activeAclProfile?.id ?? null, member.membershipId);
      onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setRemovingId(null);
    }
  };

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
                  {member.status === 'invited' && member.invitedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Convidado {formatRelativeDays(member.invitedAt)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {member.aclProfileName ? (
                    <Badge variant="secondary">{member.aclProfileName}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem perfil atribuído</span>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && member.status === 'invited' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResendingMember(member)}
                          title="Reenviar convite"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      {canAssignProfile && member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAssigningMember(member)}
                          title="Atribuir perfil de acesso"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingMember(member)}
                          title="Editar membro"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canRemove && member.userId !== currentUserId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={removingId === member.membershipId}
                              title="Remover membro"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{member.email}</strong> perderá o acesso a esta empresa. Esta ação não pode
                                ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemove(member)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
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
          open={!!assigningMember}
          onOpenChange={(open) => { if (!open) setAssigningMember(null); }}
          onSuccess={() => {
            setAssigningMember(null);
            onRefresh();
          }}
        />
      )}

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          companyId={companyId}
          open={!!editingMember}
          onOpenChange={(open) => { if (!open) setEditingMember(null); }}
          onSuccess={() => {
            setEditingMember(null);
            onRefresh();
          }}
        />
      )}

      {resendingMember && (
        <ResendInviteDialog
          member={resendingMember}
          companyId={companyId}
          open={!!resendingMember}
          onOpenChange={(open) => { if (!open) setResendingMember(null); }}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
