import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/routes';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { ThemeProvider } from '@/lib/theme/themeContext';
import { I18nProvider } from '@/lib/i18n/i18nContext';
import { AuthProvider } from '@/features/auth/authContext';
import { OrgProvider } from '@/features/org/orgContext';
import { CalculatorProvider } from '@/features/calculator/calculatorContext';
import { ToastProvider } from '@/components/ui/Toast';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <OrgProvider>
              <CalculatorProvider>
                <ToastProvider>
                  <RouterProvider router={router} />
                </ToastProvider>
              </CalculatorProvider>
            </OrgProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
