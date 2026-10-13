import { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = '2.4.0';
export const BUILD_DATE = 'October 2026';

interface AppUpdateState {
  currentVersion: string;
  buildDate: string;
  isChecking: boolean;
  updateAvailable: boolean;
  lastChecked: Date | null;
  registration: ServiceWorkerRegistration | null;
  autoUpdate: boolean;
}

const AUTO_UPDATE_KEY = 'staff_manager_auto_update';

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [autoUpdate, setAutoUpdateState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(AUTO_UPDATE_KEY) !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        setRegistration(reg);

        // Check if there's an active waiting worker
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Listen for new worker installed
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      }
    });

    // Listen for controller changes (when update completes)
    const handleControllerChange = () => {
      // Reload is handled on user action or auto
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const checkForUpdate = useCallback(async (): Promise<{ hasUpdate: boolean }> => {
    setIsChecking(true);
    setLastChecked(new Date());

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          setRegistration(reg);
          await reg.update();
          if (reg.waiting) {
            setUpdateAvailable(true);
            setIsChecking(false);
            return { hasUpdate: true };
          }
        }
      }

      // Check server network response with cache-busting
      try {
        const res = await fetch(`/?_update_check=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (res.ok) {
          // Response received successfully
        }
      } catch (netErr) {
        console.warn('Network update check note:', netErr);
      }

      // Wait 800ms for smooth user feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      // If waiting worker exists
      if (registration?.waiting) {
        setUpdateAvailable(true);
        setIsChecking(false);
        return { hasUpdate: true };
      }

      setIsChecking(false);
      return { hasUpdate: false };
    } catch (err) {
      console.warn('Error checking for app update:', err);
      setIsChecking(false);
      return { hasUpdate: false };
    }
  }, [registration]);

  const applyUpdate = useCallback(async () => {
    try {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Clear caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map((key) => {
            return caches.delete(key);
          })
        );
      }

      // Force reload with cache-bust
      window.location.reload();
    } catch (err) {
      console.warn('Error applying update:', err);
      window.location.reload();
    }
  }, [registration]);

  const forceRefreshCache = useCallback(async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.unregister();
        }
      }
      window.location.href = `/?_clean=${Date.now()}`;
    } catch (e) {
      window.location.reload();
    }
  }, []);

  const setAutoUpdate = (val: boolean) => {
    setAutoUpdateState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTO_UPDATE_KEY, val ? 'true' : 'false');
    }
  };

  return {
    currentVersion: APP_VERSION,
    buildDate: BUILD_DATE,
    isChecking,
    updateAvailable,
    lastChecked,
    autoUpdate,
    setAutoUpdate,
    checkForUpdate,
    applyUpdate,
    forceRefreshCache,
  };
}
