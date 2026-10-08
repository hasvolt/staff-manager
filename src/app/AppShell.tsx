import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  CreditCard,
  BarChart3,
  Home,
  Menu,
  X,
  Palette,
  Globe,
  Calculator,
  Settings,
  Trash2,
  HelpCircle,
  ExternalLink,
  Shield,
  FileText,
  Mail,
  Info,
  User as UserIcon,
  CloudUpload,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useCalculator } from '@/features/calculator/calculatorContext';
import { useAuth } from '@/features/auth/authContext';
import { useOrg } from '@/features/org/orgContext';
import { ThemeModal } from '@/components/ThemeModal';
import { LanguageModal } from '@/components/LanguageModal';
import { CalculatorModal } from '@/features/calculator/CalculatorModal';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { BusinessSwitcher } from '@/features/org/BusinessSwitcher';
import { SyncStatusIndicator } from '@/features/sync/SyncStatusIndicator';
import { AuthModal } from '@/features/auth/AuthModal';
import { ProfileModal } from '@/features/auth/ProfileModal';
import { CreateBusinessModal } from '@/features/org/CreateBusinessModal';
import { JoinBusinessModal } from '@/features/org/JoinBusinessModal';

export const AppShell: React.FC = () => {
  const { t, language } = useI18n();
  const { openCalculator } = useCalculator();
  const { user, isLocalMode } = useAuth();
  const { currentOrg, role } = useOrg();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isJoinOrgModalOpen, setIsJoinOrgModalOpen] = useState(false);

  const appName = import.meta.env.VITE_APP_NAME || 'Staff Manager';
  const dailyKhataUrl = import.meta.env.VITE_DAILY_KHATA_URL || 'https://www.rozfiber.com';
  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@rozfiber.com';

  const navItems = [
    { to: '/', labelKey: 'nav.home', icon: Home },
    { to: '/staff', labelKey: 'nav.staff', icon: Users },
    { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck },
    { to: '/payments', labelKey: 'nav.payments', icon: CreditCard },
    { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  ];

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] select-none">
      <OfflineIndicator />

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <NavLink to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--card-from)] to-[var(--card-to)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-bold text-sm shadow-xs group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <span className="font-bold text-base sm:text-lg leading-tight tracking-tight text-[var(--text)] hidden md:inline">
              {appName}
            </span>
          </NavLink>

          {/* Business Switcher Dropdown */}
          <BusinessSwitcher
            onCreateNew={() => setIsCreateOrgModalOpen(true)}
            onJoinInvite={() => setIsJoinOrgModalOpen(true)}
          />
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Sync Status Badge */}
          <SyncStatusIndicator />

          {/* Calculator trigger */}
          <button
            type="button"
            onClick={() => openCalculator()}
            title={t('calc.title')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition cursor-pointer"
            aria-label={t('calc.title')}
          >
            <Calculator className="w-5 h-5" />
          </button>

          {/* Theme switcher */}
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            title={t('theme.title')}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition cursor-pointer"
            aria-label={t('theme.title')}
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Language selector */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            title={t('language.title')}
            className="flex items-center gap-1 py-1.5 px-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface)] transition cursor-pointer text-xs font-semibold"
            aria-label={t('language.title')}
          >
            <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="uppercase">{language}</span>
          </button>

          {/* User Account / Profile Button */}
          {user ? (
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--surface-2)] text-[var(--accent)] text-xs font-semibold hover:bg-[var(--surface)] transition cursor-pointer"
              title="User Profile"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px] hidden sm:inline">
                {user.user_metadata?.full_name?.split(' ')[0] || 'Account'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* PWA Install Button */}
          <div className="hidden sm:block">
            <PWAInstallButton compact />
          </div>
        </div>
      </header>

      {/* Main Page Content Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-24 sm:pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md flex items-center justify-around px-2 sm:px-6 max-w-5xl sm:mx-auto"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition relative cursor-pointer ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 rounded-b-full bg-[var(--accent)]" />
              )}
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[11px] leading-tight line-clamp-1">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Drawer / Side Menu */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-xs flex animate-in fade-in"
          onClick={closeDrawer}
        >
          <div
            className="w-full max-w-xs sm:max-w-sm h-full bg-[var(--surface)] border-r border-[var(--border)] shadow-2xl flex flex-col p-4 overflow-y-auto animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text)]">{currentOrg?.name || appName}</h3>
                  <span className="text-[10px] text-[var(--text-muted)] capitalize">
                    Role: {role} &bull; {isLocalMode ? 'Local Mode' : 'Cloud Connected'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 space-y-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  if (user) setIsProfileModalOpen(true);
                  else setIsAuthModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[var(--accent)]" />
                <span>{user ? 'My Profile & Account' : 'Sign In / Sign Up'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsCreateOrgModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <CloudUpload className="w-4 h-4 text-[var(--accent)]" />
                <span>Create Another Business</span>
              </button>

              <NavLink
                to="/settings"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.settings')}</span>
              </NavLink>

              <NavLink
                to="/trash"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <Trash2 className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.trash')}</span>
              </NavLink>

              <NavLink
                to="/help"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.help')}</span>
              </NavLink>

              <div className="my-2 border-t border-[var(--border)] pt-2" />

              {/* Sister Product & External Utilities */}
              {dailyKhataUrl && (
                <a
                  href={dailyKhataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
                    <span>{t('menu.dailyKhata')}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                    Sister App
                  </span>
                </a>
              )}

              {advancedCalcUrl && (
                <a
                  href={advancedCalcUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
                >
                  <div className="flex items-center gap-3">
                    <Calculator className="w-4 h-4 text-[var(--accent)]" />
                    <span>{t('calc.advanced')}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </a>
              )}

              <div className="my-2 border-t border-[var(--border)] pt-2" />

              <NavLink
                to="/about"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <Info className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.about')}</span>
              </NavLink>

              <NavLink
                to="/privacy"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <Shield className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.privacy')}</span>
              </NavLink>

              <NavLink
                to="/terms"
                onClick={closeDrawer}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.terms')}</span>
              </NavLink>

              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition"
              >
                <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                <span>{t('menu.support')}</span>
              </a>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>Staff Manager v1.1</span>
                <span className="text-[10px] bg-[var(--surface-2)] px-2 py-0.5 rounded-md">PWA &bull; Local-First</span>
              </div>
              <p className="text-[10px]">Sister product of Daily Khata Pro</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
      <CalculatorModal />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
      <CreateBusinessModal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />
      <JoinBusinessModal
        isOpen={isJoinOrgModalOpen}
        onClose={() => setIsJoinOrgModalOpen(false)}
      />
    </div>
  );
};
