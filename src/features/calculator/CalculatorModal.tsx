import React, { useState, useEffect, useRef } from 'react';
import { useCalculator } from './calculatorContext';
import { evaluateExpression, CalculationHistoryItem } from './calculatorEngine';
import { useI18n } from '@/lib/i18n/i18nContext';
import { X, Delete, RotateCcw, ExternalLink, History, Check } from 'lucide-react';

const HISTORY_STORAGE_KEY = 'staff_manager_calc_history';

export const CalculatorModal: React.FC = () => {
  const { isOpen, initialValue, closeCalculator, submitResult } = useCalculator();
  const { t } = useI18n();

  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<number | null>(null);

  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || '';

  // Initialize display when opened
  useEffect(() => {
    if (isOpen) {
      if (initialValue && !isNaN(Number(initialValue))) {
        setDisplay(initialValue);
        setLastCalculated(Number(initialValue));
      } else {
        setDisplay('0');
        setLastCalculated(null);
      }
      setShowHistory(false);
    }
  }, [isOpen, initialValue]);

  // Handle append characters
  const handleAppend = (char: string) => {
    setDisplay((prev) => {
      if (prev === '0' && !['+', '-', '×', '÷', '%', '.'].includes(char)) {
        return char;
      }
      // Avoid consecutive operators
      if (['+', '-', '×', '÷'].includes(char) && ['+', '-', '×', '÷'].includes(prev.slice(-1))) {
        return prev.slice(0, -1) + char;
      }
      return prev + char;
    });
  };

  const handleClear = () => {
    setDisplay('0');
    setLastCalculated(null);
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleCalculate = () => {
    try {
      const res = evaluateExpression(display);
      setLastCalculated(res);

      // Save to history
      const newItem: CalculationHistoryItem = {
        id: Date.now().toString(),
        expression: display,
        result: res,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...history.slice(0, 9)];
      setHistory(updated);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {}

      setDisplay(String(res));
    } catch {
      // In case of syntax error, do not break
    }
  };

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleAppend(e.key);
      } else if (e.key === '.') {
        handleAppend('.');
      } else if (e.key === '+') {
        handleAppend('+');
      } else if (e.key === '-') {
        handleAppend('-');
      } else if (e.key === '*') {
        handleAppend('×');
      } else if (e.key === '/') {
        e.preventDefault();
        handleAppend('÷');
      } else if (e.key === '%') {
        handleAppend('%');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleCalculate();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        closeCalculator();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, display]);

  if (!isOpen) return null;

  const currentResultNumber = lastCalculated !== null ? lastCalculated : Number(display) || 0;

  const handleAdvancedClick = () => {
    if (!advancedCalcUrl) return;
    const url = new URL(advancedCalcUrl);
    if (currentResultNumber > 0) {
      url.searchParams.set('amount', String(currentResultNumber));
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="calc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--overlay)] backdrop-blur-xs"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <h3 id="calc-modal-title" className="font-semibold text-base text-[var(--text)]">
              {t('calc.title')}
            </h3>
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              title={t('calc.history')}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={closeCalculator}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
            aria-label={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--border)]">
          {showHistory ? (
            <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
              <div className="font-medium text-[var(--text-muted)] pb-1 border-b border-[var(--border)]">
                {t('calc.history')}
              </div>
              {history.length === 0 ? (
                <div className="py-2 text-[var(--text-muted)] text-center">{t('calc.noHistory')}</div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setDisplay(String(item.result));
                      setLastCalculated(item.result);
                      setShowHistory(false);
                    }}
                    className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--surface)] text-left transition"
                  >
                    <span className="text-[var(--text-muted)] truncate max-w-[150px]">{item.expression}</span>
                    <span className="font-semibold text-[var(--accent)]">= {item.result}</span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end justify-center min-h-[58px]">
              <div className="text-xs text-[var(--text-muted)] tracking-wider overflow-x-auto whitespace-nowrap max-w-full">
                {display}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[var(--text)] tracking-tight overflow-x-auto whitespace-nowrap max-w-full">
                {lastCalculated !== null ? lastCalculated : display}
              </div>
            </div>
          )}
        </div>

        {/* Calculator Grid */}
        <div className="p-3 grid grid-cols-4 gap-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl font-semibold text-sm bg-[var(--surface-2)] text-[var(--expense)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
          >
            C
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-xl text-sm bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleAppend('%')}
            className="h-12 rounded-xl font-semibold text-sm bg-[var(--surface-2)] text-[var(--accent)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleAppend('÷')}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--card-from)] text-white hover:opacity-90 transition active:scale-95 flex items-center justify-center"
          >
            ÷
          </button>

          {/* Row 2 */}
          {['7', '8', '9'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleAppend(n)}
              className="h-12 rounded-xl font-semibold text-lg bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAppend('×')}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--card-from)] text-white hover:opacity-90 transition active:scale-95 flex items-center justify-center"
          >
            ×
          </button>

          {/* Row 3 */}
          {['4', '5', '6'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleAppend(n)}
              className="h-12 rounded-xl font-semibold text-lg bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAppend('-')}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--card-from)] text-white hover:opacity-90 transition active:scale-95 flex items-center justify-center"
          >
            -
          </button>

          {/* Row 4 */}
          {['1', '2', '3'].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleAppend(n)}
              className="h-12 rounded-xl font-semibold text-lg bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAppend('+')}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--card-from)] text-white hover:opacity-90 transition active:scale-95 flex items-center justify-center"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => handleAppend('0')}
            className="h-12 rounded-xl font-semibold text-lg bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleAppend('00')}
            className="h-12 rounded-xl font-semibold text-sm bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
          >
            00
          </button>
          <button
            type="button"
            onClick={() => handleAppend('.')}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] transition active:scale-95 flex items-center justify-center"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleCalculate}
            className="h-12 rounded-xl font-bold text-lg bg-[var(--accent)] text-[var(--accent-contrast)] hover:opacity-90 transition active:scale-95 flex items-center justify-center shadow-sm"
          >
            =
          </button>
        </div>

        {/* Action Bar: Use Result & Advanced Calculators */}
        <div className="p-3 bg-[var(--surface-2)] border-t border-[var(--border)] space-y-2">
          <button
            type="button"
            onClick={() => submitResult(currentResultNumber)}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-[var(--btn-income)] text-white hover:opacity-95 shadow-sm transition flex items-center justify-center gap-2 active:scale-98"
          >
            <Check className="w-4 h-4" />
            {t('calc.useResult')} ({currentResultNumber})
          </button>

          {advancedCalcUrl && (
            <button
              type="button"
              onClick={handleAdvancedClick}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('calc.advanced')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
