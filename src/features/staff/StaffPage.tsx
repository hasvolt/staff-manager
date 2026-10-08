import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBox } from '@/components/ui/SearchBox';
import { useI18n } from '@/lib/i18n/i18nContext';
import { Users, UserPlus, Filter } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]">{t('staff.title')}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
            Add once, reuse everywhere with wage types &amp; rates
          </p>
        </div>
        <Button variant="primary" size="sm">
          <UserPlus className="w-4 h-4" />
          <span>{t('home.actionAddStaff')}</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search staff by name, phone, or role..."
        />
        <Button variant="secondary" size="md">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <EmptyState
        icon={<Users className="w-6 h-6" />}
        title="No staff members added yet"
        description="Add your first staff member with their name, role, and payment type (Daily wage, Monthly salary, Hourly, or Per piece)."
        action={
          <Button variant="primary" size="sm">
            <UserPlus className="w-4 h-4" />
            <span>{t('home.actionAddStaff')}</span>
          </Button>
        }
      />
    </div>
  );
};
