'use client';

import { Download, FileSpreadsheet, FileText, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadImportTemplate, exportClientsCsv, exportClientsPdf, exportClientsXlsx } from '@/lib/spreadsheet';
import type { Client } from '@/lib/definitions';

export function ExportClientsMenu({ clients, disabled }: { clients: Client[]; disabled?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || clients.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportClientsXlsx(clients)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportClientsCsv(clients)}>
          <Table2 className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportClientsPdf(clients)}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => downloadImportTemplate()}>
          <Download className="mr-2 h-4 w-4" />
          Baixar modelo para importação
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
