'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { saveCoraIntegration } from '@/lib/integration-actions';
import { useAuth } from '@/hooks/use-auth';
import type { CoraEnvironment } from '@/lib/integrations/cora-client';

function PemField({
  id,
  label,
  value,
  onChange,
  accept,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  accept: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onChange(text);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-3.5 w-3.5" />
          Carregar arquivo
        </Button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => void handleFile(e)} />
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="Cole o conteúdo aqui ou carregue o arquivo"
        className="font-mono text-xs"
      />
    </div>
  );
}

export function CoraConfigModal({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [environment, setEnvironment] = useState<CoraEnvironment>('sandbox');
  const [clientId, setClientId] = useState('');
  const [certificate, setCertificate] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!activeRole) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveCoraIntegration(companyId, activeRole, activeAclProfile?.id ?? null, {
        environment,
        clientId,
        certificate,
        privateKey,
      });

      if (!result.enabled) {
        setError(result.lastError ?? 'Não foi possível validar as credenciais.');
        return;
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar integração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Banco Cora</DialogTitle>
          <DialogDescription>
            Gere essas credenciais na sua conta Cora em "Conta &gt; Integrações via API" (Integração Direta) e cole
            aqui. Elas ficam criptografadas e nunca são exibidas novamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <RadioGroup value={environment} onValueChange={(v) => setEnvironment(v as CoraEnvironment)} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sandbox" id="env-sandbox" />
                <Label htmlFor="env-sandbox" className="font-normal">Sandbox (testes)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="production" id="env-production" />
                <Label htmlFor="env-production" className="font-normal">Produção</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cora-client-id">Client ID</Label>
            <Input id="cora-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} />
          </div>

          <PemField
            id="cora-certificate"
            label="Certificado (.pem)"
            value={certificate}
            onChange={setCertificate}
            accept=".pem,.crt,.cer"
          />

          <PemField
            id="cora-private-key"
            label="Chave Privada (.key)"
            value={privateKey}
            onChange={setPrivateKey}
            accept=".key,.pem"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !clientId || !certificate || !privateKey}>
            {saving ? 'Validando e salvando...' : 'Salvar e testar conexão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
