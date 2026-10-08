import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NumberInput } from '@/components/ui/NumberInput';
import { FormField } from '@/components/ui/FormField';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useCalculator } from '@/features/calculator/calculatorContext';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  CheckCircle2,
  XCircle,
  UserPlus,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Sparkles,
  ArrowRight,
  Calculator,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const { t, formatCurrency } = useI18n();
  const { openCalculator } = useCalculator();
  const { success, info } = useToast();
  const navigate = useNavigate();

  const [sampleWage, setSampleWage] = useState<number | string>(750);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Welcome & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]">
            {t('home.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            {t('tagline')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="accent">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Local-First (Offline)</span>
          </Badge>
          <button
            type="button"
            onClick={() => {
              info(t('common.syncing'));
              setTimeout(() => success(t('common.synced')), 800);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface)] transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{t('common.syncNow')}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards: 3 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card variant="gradient" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.totalStaff')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--surface)]/40 flex items-center justify-center text-[var(--accent)] shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight">
              0
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Active employees & workers
            </span>
          </div>
        </Card>

        <Card variant="gradient" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.presentToday')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--income)]/20 flex items-center justify-center text-[var(--income)] shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--income)] tracking-tight">
              0
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Logged present today
            </span>
          </div>
        </Card>

        <Card variant="gradient" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {t('home.absentToday')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[var(--expense)]/20 flex items-center justify-center text-[var(--expense)] shadow-2xs">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text-muted)] tracking-tight">
              0
            </div>
            <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
              Leaves or absent
            </span>
          </div>
        </Card>
      </div>

      {/* Primary Action Buttons (Big tap targets) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate('/staff')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionAddStaff')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/attendance')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--btn-income)] text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionAttendance')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--btn-expense)] text-white flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <CreditCard className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionPayment')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/reports')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition duration-150 active:scale-97 cursor-pointer text-center group shadow-xs"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] flex items-center justify-center mb-2.5 shadow-sm group-hover:scale-110 transition">
            <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
            {t('home.actionReports')}
          </span>
        </button>
      </div>

      {/* 3-Step First-Use Onboarding Guide */}
      <Card variant="surface" className="border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-bold text-sm sm:text-base text-[var(--text)]">
            {t('home.onboardingTitle')}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep1')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep2')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--surface-2)]/60">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-[var(--text)] font-medium leading-relaxed">
                {t('home.onboardingStep3')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Inbuilt Calculator Test & Amount Input Showcase */}
      <Card variant="surface" className="border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-bold text-sm text-[var(--text)]">
              Daily Wage &amp; Calculator Demo
            </h3>
          </div>
          <Badge variant="neutral">Phase 0 Ready</Badge>
        </div>

        <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
          Every amount field includes a direct calculator icon. Tap the calculator icon below or in the top header to compute wages, overtime, or deductions (+, -, ×, ÷, %).
        </p>

        <div className="max-w-md">
          <FormField label="Staff Daily Rate (Click calculator icon to test)" helpText="Calculations automatically fill this field">
            <NumberInput
              value={sampleWage}
              onChange={(val) => {
                setSampleWage(val);
                success(`Amount updated to: ${val}`);
              }}
              prefix="₹"
              placeholder="750"
            />
          </FormField>
        </div>
      </Card>
    </div>
  );
};
