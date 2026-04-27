'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { PageHeader } from '@/components/page-header';
import { CreateProfileModal } from '@/components/acl/create-profile-modal';
import { ProfilePermissionEditor } from '@/components/acl/profile-permission-editor';
import { MembersTable } from '@/components/acl/members-table';
import { InviteMemberModal } from '@/components/acl/invite-member-modal';
import { fetchAclProfiles, fetchCompanyMembers } from '@/lib/data';
import { deleteAclProfile } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import type { AclProfile, CompanyMember } from '@/lib/definitions';

export default function AclPage() {
  const { user, activeCompanyId, activeRole, hasPermission } = useAuth();
  const [profiles, setProfiles] = useState<AclProfile[]>([]);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<AclProfile | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const canReadAcl = hasPermission('acl', 'read');
  const canManageAcl = hasPermission('acl', 'create') || hasPermission('acl', 'update');
  const canManageUsers = hasPermission('users', 'create');

  const loadProfiles = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoadingProfiles(true);
    try {
      const fetched = await fetchAclProfiles(activeCompanyId);
      setProfiles(fetched);
      if (selectedProfile) {
        const updated = fetched.find((p) => p.id === selectedProfile.id);
        setSelectedProfile(updated ?? null);
      }
    } finally {
      setLoadingProfiles(false);
    }
  }, [activeCompanyId, selectedProfile?.id]);

  const loadMembers = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoadingMembers(true);
    try {
      const fetched = await fetchCompanyMembers(activeCompanyId);
      setMembers(fetched);
    } finally {
      setLoadingMembers(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    void loadProfiles();
  }, [activeCompanyId]);

  useEffect(() => {
    void loadMembers();
  }, [activeCompanyId]);

  const handleDeleteProfile = async (profileId: string) => {
    if (!activeCompanyId || !activeRole) return;
    try {
      await deleteAclProfile(activeCompanyId, activeRole, profileId);
      if (selectedProfile?.id === profileId) setSelectedProfile(null);
      await loadProfiles();
      await loadMembers();
    } catch (error) {
      console.error(error);
    }
  };

  if (!canReadAcl) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Você não tem permissão para visualizar o controle de acesso.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Controle de Acesso (ACL)">
        {canManageUsers && activeCompanyId && activeRole && (
          <InviteMemberModal
            companyId={activeCompanyId}
            actorRole={activeRole}
            profiles={profiles}
            onSuccess={loadMembers}
          />
        )}
        {canManageAcl && activeCompanyId && activeRole && (
          <CreateProfileModal
            companyId={activeCompanyId}
            actorRole={activeRole}
            onSuccess={loadProfiles}
          />
        )}
      </PageHeader>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">
            <ShieldCheck className="mr-2 h-4 w-4" />
            Perfis de Acesso
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Membros
          </TabsTrigger>
        </TabsList>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Profile list */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Perfis</CardTitle>
                <CardDescription>
                  Clique em um perfil para editar suas permissões.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loadingProfiles ? (
                  <div className="px-6 py-4 text-sm text-muted-foreground">Carregando...</div>
                ) : profiles.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                    Nenhum perfil criado ainda.
                  </div>
                ) : (
                  <ul className="divide-y">
                    {profiles.map((profile) => (
                      <li key={profile.id}>
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                            selectedProfile?.id === profile.id ? 'bg-muted' : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm font-medium">{profile.name}</p>
                            {profile.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {profile.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {profile.isSystem && (
                              <Badge variant="outline" className="text-xs">Sistema</Badge>
                            )}
                            {canManageAcl && !profile.isSystem && activeCompanyId && activeRole && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O perfil <strong>{profile.name}</strong> será excluído e removido de todos os membros que o utilizam. Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteProfile(profile.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Permission editor */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedProfile ? selectedProfile.name : 'Permissões'}
                </CardTitle>
                <CardDescription>
                  {selectedProfile
                    ? selectedProfile.description || 'Defina quais áreas e ações este perfil pode acessar.'
                    : 'Selecione um perfil à esquerda para editar suas permissões.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedProfile && activeCompanyId && activeRole ? (
                  <ProfilePermissionEditor
                    key={selectedProfile.id}
                    profile={selectedProfile}
                    companyId={activeCompanyId}
                    actorRole={activeRole}
                    onSaved={loadProfiles}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">Selecione um perfil para editar suas permissões</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Membros da Empresa</CardTitle>
              <CardDescription>
                Gerencie os membros e atribua perfis de acesso personalizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMembers ? (
                <p className="text-sm text-muted-foreground">Carregando membros...</p>
              ) : activeCompanyId && activeRole && user ? (
                <MembersTable
                  members={members}
                  profiles={profiles}
                  companyId={activeCompanyId}
                  actorRole={activeRole}
                  currentUserId={user.uid}
                  canManage={canManageAcl}
                  onRefresh={async () => { await loadMembers(); await loadProfiles(); }}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
