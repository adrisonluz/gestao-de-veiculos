'use client';

import CurrencyInput, { CurrencyInputProps } from 'react-currency-input-field';
import { Input } from '@/components/ui/input';

export function CurrencyInputComponent({ ...props }: CurrencyInputProps) {
  return (
    <CurrencyInput
      {...props}
      render={(renderProps) => <Input {...renderProps} />}
      prefix="R$ "
      decimalSeparator=","
      groupSeparator="."
      decimalsLimit={2}
      onValueChange={(value, name, values) => {
        if (props.onValueChange) {
            props.onValueChange(value, name, values);
        }
      }}
    />
  );
}
