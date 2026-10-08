import React, { createContext, useContext, useState, useCallback } from 'react';

interface CalculatorContextType {
  isOpen: boolean;
  initialValue: string;
  openCalculator: (initial?: number | string, onSelect?: (value: number) => void) => void;
  closeCalculator: () => void;
  submitResult: (val: number) => void;
}

const CalculatorContext = createContext<CalculatorContextType | null>(null);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialValue, setInitialValue] = useState('');
  const [callback, setCallback] = useState<((val: number) => void) | null>(null);

  const openCalculator = useCallback((initial?: number | string, onSelect?: (value: number) => void) => {
    setInitialValue(initial !== undefined && initial !== null ? String(initial) : '');
    setCallback(() => onSelect || null);
    setIsOpen(true);
  }, []);

  const closeCalculator = useCallback(() => {
    setIsOpen(false);
    setCallback(null);
  }, []);

  const submitResult = useCallback((val: number) => {
    if (callback) {
      callback(val);
    }
    closeCalculator();
  }, [callback, closeCalculator]);

  return (
    <CalculatorContext.Provider
      value={{
        isOpen,
        initialValue,
        openCalculator,
        closeCalculator,
        submitResult,
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export function useCalculator() {
  const ctx = useContext(CalculatorContext);
  if (!ctx) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return ctx;
}
