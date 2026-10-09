import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TextArea } from '@/components/ui/TextArea';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useTheme, ALL_THEMES, ThemeName } from '@/lib/theme/themeContext';
import { useOrg } from '@/features/org/orgContext';
import { useAuth } from '@/features/auth/authContext';
import { useToast } from '@/components/ui/Toast';
import { Settings, Palette, Globe, DollarSign, Building, Save, Shield } from 'lucide-react';
import { LanguageCode } from '@/locales/types';

export const SettingsPage: React.FC = () => {
  const { t, language, setLanguage, languages, currency, setCurrency } = useI18n();
  const { theme, setTheme } = useTheme();
  const { currentOrg, updateSettings, role } = useOrg();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [businessName, setBusinessName] = useState(currentOrg?.name || '');
  const [address, setAddress] = useState(currentOrg?.settings?.address || '');
  const [phone, setPhone] = useState(currentOrg?.settings?.phone || '');
  const [terminology, setTerminology] = useState(currentOrg?.settings?.terminology_preset || 'general');
  const [monthCalcMode, setMonthCalcMode] = useState(currentOrg?.settings?.month_calc_mode || 'actual');
  const [printHeader, setPrintHeader] = useState(currentOrg?.settings?.print_header || '');
  const [printFooter, setPrintFooter] = useState(currentOrg?.settings?.print_footer || '');
  const [hidePaymentsFromViewers, setHidePaymentsFromViewers] = useState(
    currentOrg?.settings?.hide_payments_from_viewers || false
  );
  const [requireOwnerDeleteApproval, setRequireOwnerDeleteApproval] = useState(
    currentOrg?.settings?.require_owner_delete_approval || false
  );
  const [customSiteLabel, setCustomSiteLabel] = useState(
    currentOrg?.settings?.custom_site_label || ''
  );
  const [customWorkLabel, setCustomWorkLabel] = useState(
    currentOrg?.settings?.custom_work_label || ''
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      setBusinessName(currentOrg.name);
      setAddress(currentOrg.settings?.address || '');
      setPhone(currentOrg.settings?.phone || '');
      setTerminology(currentOrg.settings?.terminology_preset || 'general');
      setMonthCalcMode(currentOrg.settings?.month_calc_mode || 'actual');
      setPrintHeader(currentOrg.settings?.print_header || '');
      setPrintFooter(currentOrg.settings?.print_footer || '');
      setHidePaymentsFromViewers(Boolean(currentOrg.settings?.hide_payments_from_viewers));
      setRequireOwnerDeleteApproval(Boolean(currentOrg.settings?.require_owner_delete_approval));
      setCustomSiteLabel(currentOrg.settings?.custom_site_label || '');
      setCustomWorkLabel(currentOrg.settings?.custom_work_label || '');
    }
  }, [currentOrg]);

  const currencyOptions = [
    { value: 'INR', label: 'INR (₹) - Indian Rupee' },
    { value: 'USD', label: 'USD ($) - US Dollar' },
    { value: 'AED', label: 'AED (د.إ) - UAE Dirham' },
    { value: 'SAR', label: 'SAR (﷼) - Saudi Riyal' },
    { value: 'EUR', label: 'EUR (€) - Euro' },
    { value: 'GBP', label: 'GBP (£) - British Pound' },
    { value: 'PKR', label: 'PKR (₨) - Pakistani Rupee' },
    { value: 'BDT', label: 'BDT (৳) - Bangladeshi Taka' },
    { value: 'NPR', label: 'NPR (रु) - Nepalese Rupee' },
  ];

  const terminologyOptions = [
    { value: 'general', label: 'General / Standard (Site / Work)' },
    { value: 'construction', label: 'Construction (Site / Project / Mistri / Helper)' },
    { value: 'shop', label: 'Retail Shop / Store (Shop / Sales / Cashier)' },
    { value: 'factory', label: 'Factory / Workshop (Workshop / Shift / Machine)' },
    { value: 'farm', label: 'Farm / Agriculture (Field / Harvest / Crop)' },
    { value: 'household', label: 'Household (Home / Domestic Help / Driver)' },
  ];

  const monthCalcOptions = [
    { value: 'actual', label: 'Actual Calendar Days in Month (28, 29, 30, 31)' },
    { value: 'fixed30', label: 'Fixed 30 Days Month Standard' },
  ];

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;

    setIsLoading(true);
    const res = await updateSettings({
      name: businessName.trim(),
      settings: {
        address: address.trim(),
        phone: phone.trim(),
        terminology_preset: terminology as any,
        month_calc_mode: monthCalcMode as any,
        print_header: printHeader.trim(),
        print_footer: printFooter.trim(),
        hide_payments_from_viewers: hidePaymentsFromViewers,
        require_owner_delete_approval: requireOwnerDeleteApproval,
        custom_site_label: customSiteLabel.trim() || undefined,
        custom_work_label: customWorkLabel.trim() || undefined,
      },
    });
    setIsLoading(false);

    if (res.error) {
      error(res.error.message || 'Failed to update business settings');
    } else {
      success('Business settings saved successfully!');
    }
  };

  const isOwner = role === 'owner';

  return (
    <div className="space-y-6 animate-in fade-in max-w-2xl text-left">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('settings.title')}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
          Configure business details, visual themes, language, and calculation modes
        </p>
      </div>

      {/* Business Details (Owner/Manager) */}
      <Card variant="surface" className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="font-semibold text-sm text-[var(--text)]">{t('settings.business')}</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent)]">
            Role: {role}
          </span>
        </div>

        <form onSubmit={handleSaveBusinessSettings} className="space-y-3.5">
          <FormField label="Business / Shop Name" required>
            <Input
              disabled={!isOwner}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Electrical Works"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Business Phone">
              <Input
                disabled={!isOwner}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </FormField>

            <FormField label="Default Currency">
              <Select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  success(`Currency set to ${e.target.value}`);
                }}
                options={currencyOptions}
              />
            </FormField>
          </div>

          <FormField label="Business Address / Location">
            <Input
              disabled={!isOwner}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot 14, Industrial Area, Mumbai"
            />
          </FormField>

          <FormField
            label="Terminology Preset"
            helpText="Customizes default terminology (Site, Shop, Workshop, Field)"
          >
            <Select
              disabled={!isOwner}
              value={terminology}
              onChange={(e) => setTerminology(e.target.value as any)}
              options={terminologyOptions}
            />
          </FormField>

          <FormField
            label="Monthly Salary Calculation Mode"
            helpText="Proration method used when calculating daily rate from monthly salary"
          >
            <Select
              disabled={!isOwner}
              value={monthCalcMode}
              onChange={(e) => setMonthCalcMode(e.target.value as any)}
              options={monthCalcOptions}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Custom 'Site / Project' Label"
              helpText="Rename 'Site' across the app (e.g. Shop, Field, Branch, Factory)"
            >
              <Input
                disabled={!isOwner}
                value={customSiteLabel}
                onChange={(e) => setCustomSiteLabel(e.target.value)}
                placeholder="e.g. Shop / Branch / Site"
              />
            </FormField>

            <FormField
              label="Custom 'Work / Task' Label"
              helpText="Rename 'Work Type' (e.g. Task, Service, Operation)"
            >
              <Input
                disabled={!isOwner}
                value={customWorkLabel}
                onChange={(e) => setCustomWorkLabel(e.target.value)}
                placeholder="e.g. Task / Service"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Default Print Header (Salary Slip / Receipts)">
              <Input
                disabled={!isOwner}
                value={printHeader}
                onChange={(e) => setPrintHeader(e.target.value)}
                placeholder="e.g. CONFIDENTIAL / OFFICIAL RECEIPT"
              />
            </FormField>

            <FormField label="Default Print Footer Text">
              <Input
                disabled={!isOwner}
                value={printFooter}
                onChange={(e) => setPrintFooter(e.target.value)}
                placeholder="e.g. Authorised Signatory"
              />
            </FormField>
          </div>

          {isOwner && (
            <div className="pt-2 border-t border-[var(--border)] space-y-3">
              <Switch
                label="Hide payment amounts from Viewers"
                description="When enabled, team members with the 'Viewer' role cannot see salaries or payout history."
                checked={hidePaymentsFromViewers}
                onChange={() => setHidePaymentsFromViewers(!hidePaymentsFromViewers)}
              />
              <Switch
                label="Require Owner Approval to Delete Staff with History"
                description="Managers must obtain explicit Owner confirmation before moving staff with past attendance or payments into the Trash."
                checked={requireOwnerDeleteApproval}
                onChange={() => setRequireOwnerDeleteApproval(!requireOwnerDeleteApproval)}
              />
            </div>
          )}

          {isOwner && (
            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                <Save className="w-4 h-4" />
                <span>Save Business Settings</span>
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Visual Theme Selection */}
      <Card variant="surface" className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Palette className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-semibold text-sm text-[var(--text)]">{t('settings.theme')}</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_THEMES.map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id as ThemeName);
                  success(`Theme switched to ${t(item.nameKey)}`);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer text-xs ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] font-semibold'
                    : 'border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)]'
                }`}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.accent }}
                />
                <span className="truncate">{t(item.nameKey)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Language Selection */}
      <Card variant="surface" className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Globe className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="font-semibold text-sm text-[var(--text)]">{t('settings.language')}</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code as LanguageCode);
                  success(`Language changed to ${l.nativeName}`);
                }}
                className={`flex flex-col p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--surface-2)] font-semibold'
                    : 'border-[var(--border)] bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)]'
                }`}
              >
                <span className="text-xs text-[var(--text)] font-medium leading-tight">
                  {l.nativeName}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{l.name}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
