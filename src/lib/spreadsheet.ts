import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Client } from './definitions';

const HEADERS = {
  id: 'ID',
  nome: 'Nome',
  email: 'Email',
  telefone: 'Telefone',
  cpfCnpj: 'CPF/CNPJ',
  tipoCobranca: 'Tipo de Cobrança',
  consolidarCobrancas: 'Consolidar Cobranças',
  placa: 'Placa',
  modelo: 'Modelo',
  marca: 'Marca',
  ano: 'Ano',
  cor: 'Cor',
  valorVeiculo: 'Valor do Veículo',
} as const;

export type ParsedImportRow = {
  clientId?: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  billingType: 'manual' | 'automatic';
  consolidateBilling: boolean;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleBrand?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleValue?: number;
};

function clientsToRows(clients: Client[]): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];

  for (const client of clients) {
    const base = {
      [HEADERS.id]: client.id,
      [HEADERS.nome]: client.name,
      [HEADERS.email]: client.email ?? '',
      [HEADERS.telefone]: client.phone ?? '',
      [HEADERS.cpfCnpj]: client.cpf ?? '',
      [HEADERS.tipoCobranca]: client.billingType === 'automatic' ? 'Automática' : 'Manual',
      [HEADERS.consolidarCobrancas]: client.consolidateBilling ? 'Sim' : 'Não',
    };

    if (client.vehicles.length === 0) {
      rows.push({
        ...base,
        [HEADERS.placa]: '',
        [HEADERS.modelo]: '',
        [HEADERS.marca]: '',
        [HEADERS.ano]: '',
        [HEADERS.cor]: '',
        [HEADERS.valorVeiculo]: '',
      });
    } else {
      for (const vehicle of client.vehicles) {
        rows.push({
          ...base,
          [HEADERS.placa]: vehicle.plate,
          [HEADERS.modelo]: vehicle.model,
          [HEADERS.marca]: vehicle.brand ?? '',
          [HEADERS.ano]: vehicle.year ?? '',
          [HEADERS.cor]: vehicle.color ?? '',
          [HEADERS.valorVeiculo]: vehicle.value,
        });
      }
    }
  }

  return rows;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportClientsXlsx(clients: Client[], filename = 'clientes.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(clientsToRows(clients));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
  XLSX.writeFile(workbook, filename);
}

export function exportClientsCsv(clients: Client[], filename = 'clientes.csv') {
  const worksheet = XLSX.utils.json_to_sheet(clientsToRows(clients));
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function exportClientsPdf(clients: Client[], filename = 'clientes.pdf') {
  const rows = clientsToRows(clients);
  const headers = Object.values(HEADERS);
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(14);
  doc.text('Clientes e Veículos', 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [headers],
    body: rows.map((row) => headers.map((header) => String(row[header] ?? ''))),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [1, 61, 255] },
  });

  doc.save(filename);
}

export function downloadImportTemplate(filename = 'modelo-importacao-clientes.xlsx') {
  const templateRow = Object.fromEntries(Object.values(HEADERS).map((header) => [header, ''] as const));
  const worksheet = XLSX.utils.json_to_sheet([templateRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');
  XLSX.writeFile(workbook, filename);
}

function normalizeHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES: Record<string, keyof ParsedImportRow> = {
  id: 'clientId',
  nome: 'name',
  name: 'name',
  email: 'email',
  telefone: 'phone',
  phone: 'phone',
  cpfcnpj: 'cpf',
  cpf: 'cpf',
  tipodecobranca: 'billingType',
  tipocobranca: 'billingType',
  billingtype: 'billingType',
  consolidarcobrancas: 'consolidateBilling',
  consolidatebilling: 'consolidateBilling',
  placa: 'vehiclePlate',
  plate: 'vehiclePlate',
  modelo: 'vehicleModel',
  model: 'vehicleModel',
  marca: 'vehicleBrand',
  brand: 'vehicleBrand',
  ano: 'vehicleYear',
  year: 'vehicleYear',
  cor: 'vehicleColor',
  color: 'vehicleColor',
  valordoveiculo: 'vehicleValue',
  valorveiculo: 'vehicleValue',
  valor: 'vehicleValue',
};

export function readSpreadsheetFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' }));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function parseSpreadsheetRows(rawRows: Record<string, unknown>[]): ParsedImportRow[] {
  return rawRows
    .map((raw) => {
      const mapped: Partial<ParsedImportRow> = { billingType: 'manual', consolidateBilling: false };

      for (const [key, value] of Object.entries(raw)) {
        const field = HEADER_ALIASES[normalizeHeader(key)];
        if (!field) continue;
        if (value === undefined || value === null || value === '') continue;

        if (field === 'billingType') {
          mapped.billingType = String(value).trim().toLowerCase().startsWith('auto') ? 'automatic' : 'manual';
        } else if (field === 'consolidateBilling') {
          mapped.consolidateBilling = ['sim', 'true', '1', 'yes'].includes(String(value).trim().toLowerCase());
        } else if (field === 'vehicleValue') {
          const numeric = Number(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
          mapped.vehicleValue = Number.isNaN(numeric) ? 0 : numeric;
        } else {
          (mapped as Record<string, string>)[field] = String(value).trim();
        }
      }

      return mapped as ParsedImportRow;
    })
    .filter((row): row is ParsedImportRow => Boolean(row.name));
}
