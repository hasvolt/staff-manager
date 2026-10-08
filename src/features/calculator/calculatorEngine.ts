export interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: number;
  timestamp: number;
}

export function evaluateExpression(expr: string): number {
  if (!expr || expr.trim() === '') return 0;

  // Clean expression: normalize symbols
  let cleaned = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .trim();

  // Handle trailing operator gracefully
  if (/[+\-*/]$/.test(cleaned)) {
    cleaned = cleaned.slice(0, -1);
  }

  // Handle percentage cases:
  // e.g. "1000 + 10%" -> 1000 + (1000 * 0.1) = 1100
  // e.g. "1000 - 10%" -> 1000 - (1000 * 0.1) = 900
  // e.g. "500 * 10%" -> 500 * 0.1 = 50
  // e.g. "50%" -> 0.5
  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)\s*([+\-])\s*(\d+(?:\.\d+)?)%/g, (_match, base, op, pct) => {
    const baseVal = parseFloat(base);
    const pctVal = parseFloat(pct);
    const delta = (baseVal * pctVal) / 100;
    return `${baseVal} ${op} ${delta}`;
  });

  cleaned = cleaned.replace(/(\d+(?:\.\d+)?)%/g, (_match, num) => {
    return `${parseFloat(num) / 100}`;
  });

  // Safe evaluation using Function with strict regex validation
  // Only numbers, decimals, spaces, and + - * / () allowed
  if (!/^[\d\s.+\-*/()]+$/.test(cleaned)) {
    throw new Error('Invalid mathematical expression');
  }

  // Evaluate safely
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${cleaned})`)();
  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error('Calculation error');
  }

  // Round floating point inaccuracies (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
  return Math.round(result * 1000000) / 1000000;
}
