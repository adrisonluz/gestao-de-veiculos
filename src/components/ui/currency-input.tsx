'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';

type CurrencyInputComponentProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> & {
  value?: number | string;
  onValueChange?: (value: string | undefined) => void;
};

function formatCurrencyValue(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function normalizeCurrencyValue(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return '';
  }

  return formatCurrencyValue(numericValue);
}

export function CurrencyInputComponent({ value, onValueChange, ...props }: CurrencyInputComponentProps) {
  const displayValue = React.useMemo(() => normalizeCurrencyValue(value), [value]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');

    if (!digits) {
      onValueChange?.(undefined);
      return;
    }

    const normalized = (Number(digits) / 100).toFixed(2);
    onValueChange?.(normalized);
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
    />
  );
}
