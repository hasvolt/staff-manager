import { describe, it, expect } from 'vitest';
import { evaluateExpression } from '@/features/calculator/calculatorEngine';

describe('Calculator Engine Unit Tests', () => {
  it('handles basic arithmetic', () => {
    expect(evaluateExpression('10 + 20')).toBe(30);
    expect(evaluateExpression('50 - 15')).toBe(35);
    expect(evaluateExpression('12 × 5')).toBe(60);
    expect(evaluateExpression('100 ÷ 4')).toBe(25);
  });

  it('handles floating point decimals correctly without precision bugs', () => {
    expect(evaluateExpression('0.1 + 0.2')).toBe(0.3);
    expect(evaluateExpression('10.5 × 2')).toBe(21);
    expect(evaluateExpression('99.99 + 0.01')).toBe(100);
  });

  it('handles percentage arithmetic', () => {
    // 1000 + 10% of 1000 = 1100
    expect(evaluateExpression('1000 + 10%')).toBe(1100);
    // 1000 - 10% of 1000 = 900
    expect(evaluateExpression('1000 - 10%')).toBe(900);
    // 500 * 10% = 50
    expect(evaluateExpression('500 × 10%')).toBe(50);
  });

  it('handles empty and trailing operator expressions gracefully', () => {
    expect(evaluateExpression('')).toBe(0);
    expect(evaluateExpression('50 +')).toBe(50);
    expect(evaluateExpression('100 ×')).toBe(100);
  });
});
