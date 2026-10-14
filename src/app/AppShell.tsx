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
  Building2,
  KeyRound,
  Check,
  ArrowLeftRight,
  Sparkles,
  RotateCcw,
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
import { AppLogo } from '@/components/ui/AppLogo';
import { BusinessSwitcher } from '@/features/org/BusinessSwitcher';
import { SyncStatusIndicator } from '@/features/sync/SyncStatusIndicator';
import { AuthModal } from '@/features/auth/AuthModal';
import { ProfileModal } from '@/features/auth/ProfileModal';
import { AccountSwitcherModal } from '@/features/auth/AccountSwitcherModal';
import { VersionUpdateModal } from '@/components/VersionUpdateModal';
import { CreateBusinessModal } from '@/features/org/CreateBusinessModal';
import { JoinBusinessModal } from '@/features/org/JoinBusinessModal';
import { MembersModal } from '@/features/members/MembersModal';
import { ConflictModal } from '@/features/sync/ConflictModal';
import { ActivityFeedModal } from '@/features/sync/ActivityFeedModal';
import { BackupRestoreModal } from '@/features/sync/BackupRestoreModal';
import { isGoogleTranslateActive, getCurrentGoogleTranslateLanguage, resetGoogleTranslate } from '@/lib/i18n/googleTranslate';
import { returnToEnglish } from '@/lib/i18n/fullAppTranslator';

export const AppShell: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const { openCalculator } = useCalculator();
  const { user, profile, isLocalMode, signOut } = useAuth();
  const { currentOrg, organizations, switchBusiness, orgRoles, role } = useOrg();
  const { success } = useToast();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [authModalPrefilledEmail, setAuthModalPrefilledEmail] = useState<string | undefined>(undefined);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isJoinOrgModalOpen, setIsJoinOrgModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState('');
  const [membersModalTab, setMembersModalTab] = useState<'members' | 'invites' | 'devices'>('members');

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-[var(--bg)] text-[var(--text)] select-none">
      <OfflineIndicator />

      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full max-w-full overflow-hidden h-14 sm:h-16 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-2.5 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Navigation Menu & Organization Context */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* App Brand */}
          <NavLink
            to="/"
            className="flex items-center gap-1.5 sm:gap-2 group shrink-0"
            title="Staff Manager Home"
          >
            {/* On small mobile: show emblem badge so logo is always visible */}
            <div className="flex sm:hidden items-center">
              <AppLogo size="xs" badgeOnly />
            </div>
            {/* On sm+: show full logo with text */}
            <div className="hidden sm:flex items-center">
              <AppLogo size="sm" showText={true} />
            </div>
          </NavLink>

          {/* Subtle vertical separator on sm+ */}
          <div className="hidden sm:block w-px h-5 bg-[var(--border)] shrink-0" />

          {/* Business Switcher Dropdown */}
          <BusinessSwitcher
            onCreateNew={() => setIsCreateOrgModalOpen(true)}
            onJoinInvite={() => setIsJoinOrgModalOpen(true)}
            onOpenMembers={() => {
              setMembersModalTab('invites');
              setIsMembersModalOpen(true);
            }}
            onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
          />
        </div>

        {/* Right Header Controls (Uncluttered, responsive & mobile-optimized) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Cloud & Local Sync Status Badge */}
          <SyncStatusIndicator />

          {/* Language Switcher (Replaces calculator in header per user instruction) */}
          <button
            type="button"
            onClick={() => setIsLangModalOpen(true)}
            title={`Language / भाषा बदलें (${(getCurrentGoogleTranslateLanguage() || language).toUpperCase()})`}
            className="h-8 sm:h-10 px-2 sm:px-2.5 rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] hover:border-[var(--accent)] text-[var(--text)] transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center justify-center gap-1.5"
            aria-label="Change Language"
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text)]">
              {(getCurrentGoogleTranslateLanguage() || language).toUpperCase()}
            </span>
          </button>

          {/* Theme Colors Shortcut (Visible on desktop & tablets, hidden on small phones to prevent overload) */}
          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            title="Theme Colors / थीम रंग"
            className="hidden sm:flex w-10 h-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0"
            aria-label="Theme Colors"
          >
            <Palette className="w-4.5 h-4.5" />
          </button>

          {/* User Account / Profile Menu */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="h-8 w-8 sm:h-10 sm:w-auto p-1 sm:pl-1.5 sm:pr-2 sm:px-2.5 rounded-xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)] text-[var(--text)] transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs shrink-0 flex items-center justify-center gap-1.5 sm:gap-2"
                title="Account Menu & Switcher"
                aria-label="Account Menu"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0">
                  {profile?.full_name?.trim()?.charAt(0).toUpperCase() ||
                    user.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() || (
                      <UserIcon className="w-3.5 h-3.5" />
                    )}
                </div>
                <span className="truncate max-w-[70px] sm:max-w-[100px] text-xs font-semibold hidden md:inline">
                  {profile?.full_name?.trim()?.split(' ')[0] ||
                    user.user_metadata?.full_name?.split(' ')[0] ||
                    'Account'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 hidden sm:block" />
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
                      setIsAccountSwitcherOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                      <span>Switch Account (खाता बदलें)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                      Profiles
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsVersionModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Check for Updates (v2.4.0)</span>
                    </div>
                    <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-mono font-bold">
                      v2.4.0
                    </span>
                  </button>

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

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsMembersModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition font-medium cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[var(--accent)]" />
                    <span>Team Members & Roles</span>
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
              className="h-8.5 sm:h-10 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] text-xs font-bold hover:opacity-95 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm shadow-[var(--accent)]/20 shrink-0 flex items-center gap-1.5"
              title="Sign In / Register"
              aria-label="Sign In / Register"
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Dedicated Desktop Navigation Bar (Spacious, Clean, Zero Overload) */}
      <nav
        aria-label="Desktop Primary Navigation"
        className="hidden md:block sticky top-14 sm:top-16 z-30 w-full border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md shadow-2xs"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
          {/* Primary Navigation Tabs */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 select-none ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Right Sub-nav Info: Date & Quick Link */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
            <span className="hidden lg:inline-flex items-center gap-1.5 bg-[var(--surface-2)]/80 px-2.5 py-1 rounded-lg border border-[var(--border)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </span>

            {import.meta.env.VITE_DAILY_KHATA_URL && (
              <a
                href={import.meta.env.VITE_DAILY_KHATA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition"
                title="Open Daily Khata Pro"
              >
                <span>Daily Khata Pro</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Page Content Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 pb-20 md:pb-8 overflow-x-hidden">
        <Outlet />
      </main>

      {/* ========================================================= */}
      {/* DESKTOP FOOTER & NAVIGATION BAR (md+ only) */}
      {/* ========================================================= */}
      <footer className="hidden md:block w-full max-w-full overflow-hidden border-t border-[var(--border)] bg-[var(--surface)] text-[var(--text)] mt-auto transition-colors">
        {/* Desktop Footer Navigation Bar */}
        <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1 hidden lg:inline">
                Navigation:
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
              <NavLink
                to="/settings"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  location.pathname === '/settings'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>{t('menu.settings')}</span>
              </NavLink>
              <NavLink
                to="/trash"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  location.pathname === '/trash'
                    ? 'bg-[var(--accent)] text-[var(--accent-contrast)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{t('menu.trash')}</span>
              </NavLink>
            </div>

            {/* Quick Tools in Footer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsThemeModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition cursor-pointer"
                title="12 Themes"
              >
                <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Themes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLangModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition cursor-pointer"
                title="Google Translator (100+)"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Languages</span>
              </button>

              <button
                type="button"
                onClick={() => openCalculator()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-[var(--border)] transition cursor-pointer"
                title="Quick Inbuilt Calculator"
              >
                <Calculator className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Calculator</span>
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Footer Columns & Information */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Col 1: Brand & Tagline */}
            <div className="space-y-3 min-w-0">
              <AppLogo size="sm" showText={true} subtitle="Staff, Work & Payroll System" />
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Universal staff attendance, daily work entries, advances, deductions, wage calculation and professional salary statements for small businesses, contractors, shops, farms &amp; workshops.
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Offline Ready (IndexedDB)
                </span>
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(true)}
                  className="text-[10px] font-mono text-[var(--accent)] hover:underline bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--border)] cursor-pointer"
                >
                  v2.4.0 Updates
                </button>
              </div>
            </div>

            {/* Col 2: Core Management */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                Management &amp; Tools
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                <li>
                  <NavLink to="/staff" className="hover:text-[var(--accent)] transition">
                    Staff Directory &amp; Rates
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/attendance" className="hover:text-[var(--accent)] transition">
                    Daily Attendance Register
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/payments" className="hover:text-[var(--accent)] transition">
                    Salaries, Advances &amp; Loans
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/reports" className="hover:text-[var(--accent)] transition">
                    Monthly Reports &amp; Salary Slips
                  </NavLink>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsAccountSwitcherOpen(true)}
                    className="hover:text-[var(--accent)] transition cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                    <span>Switch Account &amp; Business</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Utilities & Sister Apps */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                Utilities &amp; Links
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                {dailyKhataUrl && (
                  <li>
                    <a
                      href={dailyKhataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--accent)] transition inline-flex items-center gap-1 text-[var(--accent)] font-medium"
                    >
                      <span>Daily Khata Pro</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                )}
                {advancedCalcUrl && (
                  <li>
                    <a
                      href={advancedCalcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--accent)] transition inline-flex items-center gap-1"
                    >
                      <span>Advanced Calculators (Daily Khata)</span>
                      <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                    </a>
                  </li>
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => setIsBackupModalOpen(true)}
                    className="hover:text-[var(--accent)] transition cursor-pointer text-left"
                  >
                    Local Backup &amp; JSON Restore
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsMembersModalOpen(true)}
                    className="hover:text-[var(--accent)] transition cursor-pointer text-left"
                  >
                    Team Members &amp; Roles (RBAC)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsActivityModalOpen(true)}
                    className="hover:text-[var(--accent)] transition cursor-pointer text-left"
                  >
                    Activity &amp; Audit Trail
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Trust & Support */}
            <div className="space-y-2.5 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                Privacy &amp; Support
              </h4>
              <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                <li>
                  <NavLink to="/privacy" className="hover:text-[var(--accent)] transition">
                    Privacy Policy (No Data Selling)
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/terms" className="hover:text-[var(--accent)] transition">
                    Terms of Use &amp; Disclaimer
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/about" className="hover:text-[var(--accent)] transition">
                    About Staff Manager
                  </NavLink>
                </li>
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="hover:text-[var(--accent)] transition inline-flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>{supportEmail}</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Security Line */}
          <div className="mt-8 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</span>
              <span>&bull;</span>
              <span>Sister App of Daily Khata Pro</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Shield className="w-3 h-3" />
                Bank-grade RLS Security
              </span>
              <span>&bull;</span>
              <span>Cloud Synced &amp; Offline First</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation Bar (Thumb-friendly for mobile, hidden on md+ where top nav is active) */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md flex md:hidden items-center justify-around px-2 sm:px-6 shadow-lg"
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
                <AppLogo size="sm" badgeOnly />
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[var(--text)] truncate">{currentOrg?.name || appName}</h3>
                  <span className="text-[10px] text-[var(--text-muted)] capitalize block">
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

            {/* Dedicated Top Active Account & Business Card with Switcher */}
            <div className="p-3 mb-3.5 rounded-2xl bg-[var(--surface-2)]/90 border border-[var(--border)] shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Active Account &amp; Profile
                </span>
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    setIsAccountSwitcherOpen(true);
                  }}
                  className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--surface)] px-2 py-0.5 rounded-lg border border-[var(--border)] transition active:scale-95"
                >
                  <ArrowLeftRight className="w-3 h-3 text-emerald-400" />
                  <span>Switch / बदलें</span>
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                  {profile?.full_name?.trim()?.charAt(0).toUpperCase() ||
                    user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() || (
                      <UserIcon className="w-4 h-4" />
                    )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[var(--text)] truncate">
                    {profile?.full_name || user?.user_metadata?.full_name || (user ? 'Account' : 'Guest Mode')}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {user?.email || 'Local device storage'}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[var(--border)]/60 flex items-center justify-between text-xs">
                <div className="min-w-0 flex items-center gap-1.5 text-[11px] text-[var(--text)] font-medium">
                  <Building2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="truncate">{currentOrg?.name || appName}</span>
                </div>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--accent)] shrink-0 border border-[var(--border)]">
                  {role}
                </span>
              </div>
            </div>

            {/* Workspaces & Multi-Business Switcher in Drawer */}
            {organizations.length > 1 && (
              <div className="mb-3 pb-3 border-b border-[var(--border)]">
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <span>Switch Business ({organizations.length})</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 mt-1 pr-1">
                  {organizations.map((org) => {
                    const isSelected = org.id === currentOrg?.id;
                    const orgRole = orgRoles[org.id] || (org.owner_id === (user?.id || 'local_user') ? 'owner' : 'viewer');
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => {
                          switchBusiness(org.id);
                          closeDrawer();
                          success(`Switched to "${org.name}"`);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--surface-2)] text-[var(--text)] font-semibold border border-[var(--accent)]/30'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--accent)]' : ''}`} />
                          <span className="truncate">{org.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--text-muted)] font-bold">
                            {orgRole}
                          </span>
                          {isSelected && <Check className="w-3 h-3 text-[var(--accent)]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  setIsAccountSwitcherOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                  <span>Switch Account (खाता बदलें)</span>
                </div>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  Multi-User
                </span>
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
                  setIsJoinOrgModalOpen(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-sky-400" />
                <span>Join with Invite Code</span>
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
                  <span>Language / भाषा बदलें</span>
                </div>
                <span className="text-[10px] bg-[var(--surface-2)] text-[var(--accent)] px-2 py-0.5 rounded-full font-bold uppercase">
                  {(getCurrentGoogleTranslateLanguage() || language)}
                </span>
              </button>

              {/* Quick Return to English Button in Drawer */}
              {(language !== 'en' || isGoogleTranslateActive()) && (
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    resetGoogleTranslate();
                    returnToEnglish();
                    setLanguage('en');
                    success('Switched back to English (मूल अंग्रेज़ी)');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition text-left cursor-pointer font-bold text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Return to English / मूल अंग्रेज़ी</span>
                </button>
              )}

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

              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsVersionModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text)] hover:bg-[var(--surface-2)] transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>New Version & Updates (वर्शन अपडेट)</span>
                </div>
                <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-mono font-bold">
                  v2.4.0
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
            <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  setIsVersionModalOpen(true);
                }}
                className="text-left w-full cursor-pointer hover:opacity-85 transition"
              >
                <AppLogo size="xs" showText={true} subtitle="v2.4.0 • Tap for Updates" />
              </button>
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>Sister app of Daily Khata Pro</span>
                <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded-md font-mono">Offline Ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
      <LanguageModal isOpen={isLangModalOpen} onClose={() => setIsLangModalOpen(false)} />
      <CalculatorModal />
      <AuthModal
        isOpen={isAuthModalOpen}
        initialEmail={authModalPrefilledEmail}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthModalPrefilledEmail(undefined);
        }}
      />
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
      />
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        onOpenAuth={(email) => {
          setAuthModalPrefilledEmail(email);
          setIsAuthModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenCreateBusiness={() => setIsCreateOrgModalOpen(true)}
      />
      <VersionUpdateModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
      <CreateBusinessModal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />
      <JoinBusinessModal
        isOpen={isJoinOrgModalOpen}
        initialCode={inviteCodeFromUrl}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onClose={() => {
          setIsJoinOrgModalOpen(false);
          setInviteCodeFromUrl('');
          if (typeof window !== 'undefined' && window.location.search.includes('invite')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
          }
        }}
      />
      <MembersModal
        isOpen={isMembersModalOpen}
        initialTab={membersModalTab}
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
