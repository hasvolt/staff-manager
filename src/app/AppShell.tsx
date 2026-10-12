import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  LogOut,
  CloudUpload,
  UserCheck,
  Activity,
  Database,
  GitMerge,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useCalculator } from '@/features/calculator/calculatorContext';
import { useAuth } from '@/features/auth/authContext';
import { useOrg } from '@/features/org/orgContext';
import { useToast } from '@/components/ui/Toast';
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
import { MembersModal } from '@/features/members/MembersModal';
import { ConflictModal } from '@/features/sync/ConflictModal';
import { ActivityFeedModal } from '@/features/sync/ActivityFeedModal';
import { BackupRestoreModal } from '@/features/sync/BackupRestoreModal';

export const AppShell: React.FC = () => {
  const { t, language } = useI18n();
  const { openCalculator } = useCalculator();
  const { user, profile, isLocalMode, signOut } = useAuth();
  const { currentOrg, role } = useOrg();
  const { success } = useToast();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isJoinOrgModalOpen, setIsJoinOrgModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auto-detect invite link code in URL (?invite=CODE)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCodeFromUrl(code);
      setIsJoinOrgModalOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const appName = import.meta.env.VITE_APP_NAME || 'Staff Manager';
  const dailyKhataUrl = import.meta.env.VITE_DAILY_KHATA_URL || 'https://www.rozfiber.com';
  const advancedCalcUrl = import.meta.env.VITE_ADVANCED_CALCULATOR_URL || 'https://www.rozfiber.com/calculator';
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@rozfiber.com';

  const navItems = [
    { to: '/', labelKey: 'nav.home', icon: Home, visible: true },
    { to: '/staff', labelKey: 'nav.staff', icon: Users, visible: true },
    { to: '/attendance', labelKey: 'nav.attendance', icon: CalendarCheck, visible: true },
    { to: '/payments', labelKey: 'nav.payments', icon: CreditCard, visible: role !== 'supervisor' },
    { to: '/reports', labelKey: 'nav.reports', icon: BarChart3, visible: role !== 'supervisor' },
  ].filter((item) => item.visible);

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--text)] select-none">
      <OfflineIndicator />

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Navigation Menu & Organization Context */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* App Brand (Shown when no org selected or on medium+ screens) */}
          <NavLink to="/" className={`${currentOrg ? 'hidden md:flex' : 'flex'} items-center gap-2.5 group shrink-0`}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[var(--card-from)] to-[var(--card-to)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] font-bold text-sm shadow-xs group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <span className="font-bold text-base sm:text-lg leading-tight tracking-tight text-[var(--text)] hidden lg:inline">
              {appName}
            </span>
          </NavLink>

          {/* Business Switcher Dropdown */}
          <BusinessSwitcher
            onCreateNew={() => setIsCreateOrgModalOpen(true)}
            onJoinInvite={() => setIsJoinOrgModalOpen(true)}
          />
        </div>

        {/* Right Header Controls (Clean, Focused & Uncluttered) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Cloud & Local Sync Status Badge */}
          <SyncStatusIndicator />

          {/* Quick Inbuilt Calculator */}
          <button
            type="button"
            onClick={() => openCalculator()}
            title={t('calc.title')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0"
            aria-label={t('calc.title')}
          >
            <Calculator className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          {/* User Account / Profile Menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-9 sm:h-10 pl-1.5 pr-2 sm:px-2.5 rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text)] transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center gap-1.5 sm:gap-2"
                title="Account Menu"
                aria-label="Account Menu"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0">
                  {profile?.full_name?.trim()?.charAt(0).toUpperCase() ||
                    user.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() || (
                      <UserIcon className="w-3.5 h-3.5" />
                    )}
                </div>
                <span className="truncate max-w-[70px] sm:max-w-[100px] text-xs font-semibold hidden min-[400px]:inline">
                  {profile?.full_name?.trim()?.split(' ')[0] ||
                    user.user_metadata?.full_name?.split(' ')[0] ||
                    'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1 text-left">
                  {/* User info banner */}
                  <div className="p-2 border-b border-[var(--border)] mb-1">
                    <p className="font-bold text-xs text-[var(--text)] truncate">
                      {profile?.full_name || user.user_metadata?.full_name || 'My Account'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold bg-[var(--surface-2)] text-[var(--accent)] px-2 py-0.5 rounded-md capitalize">
                        {role}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {isLocalMode ? 'Local Mode' : 'Cloud Synced'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-[var(--accent)]" />
                    <span>My Profile & Security</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsThemeModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className="w-4 h-4 text-[var(--accent)]" />
                      <span>Theme Colors</span>
                    </div>
                    <span className="text-[10px] bg-[var(--surface-2)] text-[var(--accent)] px-2 py-0.5 rounded-full capitalize">
                      12 Themes
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLangModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-[var(--accent)]" />
                      <span>Google Translator</span>
                    </div>
                    <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded-full uppercase">
                      {language}
                    </span>
                  </button>

                  <NavLink
                    to="/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium"
                  >
                    <Settings className="w-4 h-4 text-[var(--text-muted)]" />
                    <span>Settings</span>
                  </NavLink>

                  <div className="my-1 border-t border-[var(--border)]" />

                  <button
                    type="button"
                    onClick={async () => {
                      setIsUserMenuOpen(false);
                      await signOut();
                      success('Signed out successfully');
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-[var(--expense)] hover:bg-[var(--expense)]/10 transition font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold hover:opacity-95 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm shadow-[var(--accent)]/20 shrink-0 flex items-center gap-1.5"
              title="Sign In / Register"
              aria-label="Sign In / Register"
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Page Content Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-24 sm:pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t-2 border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md flex items-center justify-around px-2 sm:px-6 max-w-5xl sm:mx-auto shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95 relative cursor-pointer select-none ${
                isActive
                  ? 'text-[var(--accent)] font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 w-10 h-1 rounded-b-full bg-[var(--accent)] shadow-xs shadow-[var(--accent)]" />
              )}
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? 'bg-[var(--accent)]/12' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight line-clamp-1 mt-0.5">
                {t(item.labelKey)}
              </span>
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

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsMembersModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[var(--accent)]" />
                <span>Team Members & Roles</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsConflictModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <GitMerge className="w-4 h-4 text-amber-500" />
                <span>Sync Conflicts</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsActivityModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <Activity className="w-4 h-4 text-[var(--accent)]" />
                <span>Activity & Audit Log</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsBackupModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-500" />
                <span>Backup & Restore Data</span>
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

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsThemeModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-[var(--accent)]" />
                  <span>Theme Colors & Mode</span>
                </div>
                <span className="text-[10px] bg-[var(--surface-2)] text-[var(--accent)] px-2 py-0.5 rounded-full font-medium">
                  12 Themes
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsLangModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[var(--accent)]" />
                  <span>Google Translator & Language</span>
                </div>
                <span className="text-[10px] bg-[var(--surface-2)] text-[var(--accent)] px-2 py-0.5 rounded-full font-medium">
                  100+ Online
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  openCalculator();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-4 h-4 text-[var(--accent)]" />
                  <span>Inbuilt Quick Calculator</span>
                </div>
                <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-medium">
                  + - &times; / %
                </span>
              </button>

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
        initialCode={inviteCodeFromUrl}
        onClose={() => {
          setIsJoinOrgModalOpen(false);
          setInviteCodeFromUrl('');
        }}
      />
      <MembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
      />
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
      />
      <ActivityFeedModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
      />
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
};
