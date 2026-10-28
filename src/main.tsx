import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './index.css';
import App from './App';
import { PrefsProvider } from '@/providers/prefs';
import { AuthProvider } from '@/providers/auth';
import { MetaProvider } from '@/providers/meta';
import { ToastProvider } from '@/providers/toast';
import { PaletteSwitcher } from '@/components/PaletteSwitcher';
import { applyPalette, getPalette } from '@/lib/palette';

applyPalette(getPalette());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <MetaProvider>
              <ToastProvider>
                <App />
                <PaletteSwitcher />
              </ToastProvider>
            </MetaProvider>
          </AuthProvider>
        </BrowserRouter>
      </MotionConfig>
    </PrefsProvider>
  </StrictMode>,
);
