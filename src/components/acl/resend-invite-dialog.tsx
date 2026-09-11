'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { resendInvite } from '@/lib/actions';
import type { CompanyMember } from '@/lib/definitions';
import { useAuth } from '@/hooks/use-auth';

export function ResendInviteDialog({
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupUrl = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '/signup';

  const handleResend = async () => {
    if (!activeRole) return;
    setSending(true);
    setError(null);
    try {
      await resendInvite(companyId, activeRole, activeAclProfile?.id ?? null, member.membershipId);
      setSent(true);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao reenviar convite.');
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — usuário pode selecionar o texto manualmente
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reenviar Convite</DialogTitle>
          <DialogDescription>
            O sistema ainda não envia e-mails automaticamente. Envie o link abaixo manualmente para{' '}
            <strong>{member.email}</strong>. Assim que essa pessoa criar uma conta (ou entrar, se já tiver uma) com
            esse mesmo e-mail, ela será vinculada automaticamente a esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input readOnly value={signupUrl} />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleResend} disabled={sending || sent}>
            {sending ? 'Atualizando...' : sent ? 'Convite atualizado' : 'Marcar como reenviado'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
