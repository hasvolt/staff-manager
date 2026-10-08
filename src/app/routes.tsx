import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })));
const StaffPage = lazy(() => import('@/features/staff/StaffPage').then((m) => ({ default: m.StaffPage })));
const AttendancePage = lazy(() =>
  import('@/features/attendance/AttendancePage').then((m) => ({ default: m.AttendancePage }))
);
const PaymentsPage = lazy(() =>
  import('@/features/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage }))
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const TrashPage = lazy(() => import('@/features/trash/TrashPage').then((m) => ({ default: m.TrashPage })));
const HelpPage = lazy(() => import('@/features/help/HelpPage').then((m) => ({ default: m.HelpPage })));
const AboutPage = lazy(() => import('@/features/legal/AboutPage').then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() =>
  import('@/features/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() => import('@/features/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() =>
  import('@/features/notFound/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const PageFallback: React.FC = () => (
  <div className="space-y-4 py-4 animate-in fade-in">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <Skeleton className="h-44 w-full" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageFallback />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'staff',
        element: (
          <Suspense fallback={<PageFallback />}>
            <StaffPage />
          </Suspense>
        ),
      },
      {
        path: 'attendance',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AttendancePage />
          </Suspense>
        ),
      },
      {
        path: 'payments',
        element: (
          <Suspense fallback={<PageFallback />}>
            <PaymentsPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'trash',
        element: (
          <Suspense fallback={<PageFallback />}>
            <TrashPage />
          </Suspense>
        ),
      },
      {
        path: 'help',
        element: (
          <Suspense fallback={<PageFallback />}>
            <HelpPage />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<PageFallback />}>
            <AboutPage />
          </Suspense>
        ),
      },
      {
        path: 'privacy',
        element: (
          <Suspense fallback={<PageFallback />}>
            <PrivacyPage />
          </Suspense>
        ),
      },
      {
        path: 'terms',
        element: (
          <Suspense fallback={<PageFallback />}>
            <TermsPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);
