import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, reload to update');
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

// Auto-activate Google Translate if user has active Google Translate language
import('./lib/i18n/googleTranslate').then(({ isGoogleTranslateActive, loadGoogleTranslateScript }) => {
  if (isGoogleTranslateActive()) {
    loadGoogleTranslateScript();
  }
}).catch(() => {});

createRoot(document.getElementById('root')!).render(<App />);
