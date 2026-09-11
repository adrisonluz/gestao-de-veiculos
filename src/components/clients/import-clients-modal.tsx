'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { importClients } from '@/lib/actions';
import { isValidCpfOrCnpj, isValidPlate } from '@/lib/input-masks';
import { parseSpreadsheetRows, readSpreadsheetFile, type ParsedImportRow } from '@/lib/spreadsheet';
import { useAuth } from '@/hooks/use-auth';

type RowPreview = ParsedImportRow & { rowError?: string };

export function ImportClientsModal({
  companyId,
  disabled,
  onImported,
}: {
  companyId: string;
  disabled?: boolean;
  onImported: () => void;
}) {
  const { activeRole, activeAclProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<RowPreview[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setFileError(null);
    setResult(null);

    try {
      const rawRows = await readSpreadsheetFile(file);
      const parsedRows = parseSpreadsheetRows(rawRows);

      if (parsedRows.length === 0) {
        setFileError('Nenhuma linha válida encontrada na planilha (verifique se a coluna "Nome" está preenchida).');
        setRows([]);
        return;
      }

      const withValidation: RowPreview[] = parsedRows.map((row) => {
        if (row.cpf && !isValidCpfOrCnpj(row.cpf)) {
          return { ...row, rowError: `CPF/CNPJ inválido: ${row.cpf}` };
        }
        if (row.vehiclePlate && !isValidPlate(row.vehiclePlate)) {
          return { ...row, rowError: `Placa inválida: ${row.vehiclePlate}` };
        }
        return row;
      });

      setRows(withValidation);
    } catch (error) {
      console.error(error);
      setFileError('Não foi possível ler o arquivo. Verifique se é um .xlsx ou .csv válido.');
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!activeRole) return;
    const validRows = rows.filter((row) => !row.rowError);
    if (validRows.length === 0) return;

    setImporting(true);
    try {
      const summary = await importClients(companyId, activeRole, activeAclProfile?.id ?? null, validRows);
      setResult(summary);
      onImported();
    } catch (error: any) {
      setFileError(error?.message ?? 'Erro ao importar clientes.');
    } finally {
      setImporting(false);
    }
  }

  const invalidCount = rows.filter((row) => row.rowError).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Clientes e Veículos</DialogTitle>
          <DialogDescription>
            Envie um arquivo .xlsx ou .csv. Use o modelo disponível no menu "Exportar" para garantir que as colunas
            estejam corretas. Linhas com a coluna "ID" preenchida atualizam o cliente correspondente; as demais
            criam clientes novos.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="block w-full text-sm"
          onChange={(e) => void handleFileChange(e)}
          disabled={parsing || importing}
        />

        {parsing && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lendo planilha...
          </p>
        )}

        {fileError && <p className="text-sm text-destructive">{fileError}</p>}

        {rows.length > 0 && !result && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {rows.length} linha(s) lida(s){invalidCount > 0 ? `, ${invalidCount} com erro (não serão importadas)` : ''}.
            </p>
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Placa</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.cpf ?? '—'}</TableCell>
                      <TableCell>{row.vehiclePlate ?? '—'}</TableCell>
                      <TableCell className={row.rowError ? 'text-destructive' : 'text-muted-foreground'}>
                        {row.rowError ?? (row.clientId ? 'Atualizar' : 'Criar novo')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <p>{result.created} cliente(s) criado(s).</p>
            <p>{result.updated} cliente(s) atualizado(s).</p>
            {result.errors.length > 0 && (
              <div className="text-destructive">
                <p>{result.errors.length} erro(s):</p>
                <ul className="list-disc pl-5">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {result ? 'Fechar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleConfirm} disabled={rows.length === 0 || invalidCount === rows.length || importing}>
              {importing ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
