import React from 'react';
import { Calculator } from 'lucide-react';
import { useCalculator } from '@/features/calculator/calculatorContext';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (value: number | string) => void;
  showCalculatorIcon?: boolean;
  prefix?: string;
  suffix?: string;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      showCalculatorIcon = true,
      prefix,
      suffix,
      className = '',
      disabled,
      placeholder = '0',
      ...props
    },
    ref
  ) => {
    const { openCalculator } = useCalculator();

    const handleCalculatorClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openCalculator(value, (calculatedResult) => {
        onChange(calculatedResult);
      });
    };

    return (
      <div className="relative flex items-center w-full">
        {prefix && (
          <span className="absolute left-3 text-xs font-semibold text-[var(--text-muted)] pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="number"
          step="any"
          disabled={disabled}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm py-2.5 outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 ${
            prefix ? 'pl-8' : 'pl-3'
          } ${showCalculatorIcon || suffix ? 'pr-11' : 'pr-3'} ${className}`}
          {...props}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {suffix && (
            <span className="text-xs text-[var(--text-muted)] pointer-events-none select-none pr-1">
              {suffix}
            </span>
          )}
          {showCalculatorIcon && !disabled && (
            <button
              type="button"
              onClick={handleCalculatorClick}
              title="Open Calculator"
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition active:scale-90"
              tabIndex={-1}
            >
              <Calculator className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';
