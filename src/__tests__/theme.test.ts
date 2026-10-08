import { describe, it, expect } from 'vitest';
import { ALL_THEMES } from '@/lib/theme/themeContext';

describe('Theme System Tests', () => {
  it('defines exactly 12 required themes', () => {
    expect(ALL_THEMES).toHaveLength(12);
  });

  it('contains all required theme names', () => {
    const ids = ALL_THEMES.map((t) => t.id);
    expect(ids).toContain('emerald-black');
    expect(ids).toContain('deep-obsidian');
    expect(ids).toContain('monochrome');
    expect(ids).toContain('electric-blue');
    expect(ids).toContain('premium-gold');
    expect(ids).toContain('sunset-orange');
    expect(ids).toContain('emerald-green');
    expect(ids).toContain('royal-violet');
    expect(ids).toContain('ocean-teal');
    expect(ids).toContain('crimson-pink');
    expect(ids).toContain('day-white');
    expect(ids).toContain('daylight-light');
  });

  it('has valid hex color tokens for every theme', () => {
    ALL_THEMES.forEach((theme) => {
      expect(theme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
