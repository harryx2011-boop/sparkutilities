import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { ThemeProvider } from '@/context/ThemeContext';
import { BrandingProvider } from '@/context/BrandingContext';
import { ToolThemeProvider } from '@/context/ToolThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';

import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';

const ImageEditor       = lazy(() => import('@/pages/ImageEditor'));
const FileConverter     = lazy(() => import('@/pages/FileConverter'));
const FluxKitHome       = lazy(() => import('@/pages/FluxKitHome'));
const AudioModifier     = lazy(() => import('@/pages/AudioModifier'));
const ContentPreviewer  = lazy(() => import('@/pages/ContentPreviewer'));
const DataStructure     = lazy(() => import('@/pages/fluxkit/DataStructure'));
const WebDevAssets      = lazy(() => import('@/pages/fluxkit/WebDevAssets'));
const SecurityLogic     = lazy(() => import('@/pages/fluxkit/SecurityLogic'));
const Productivity      = lazy(() => import('@/pages/fluxkit/Productivity'));
const LaTeXBuilder      = lazy(() => import('@/pages/fluxkit/LaTeXBuilder'));
const Settings          = lazy(() => import('@/pages/Settings'));

function RouteFallback() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)' }} className="flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-neutral-700 border-t-neutral-300 animate-spin" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <ThemeProvider>
        <BrandingProvider>
        <ToolThemeProvider>
        <SettingsProvider>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/image-editor"   element={<ImageEditor />} />
                <Route path="/image-modifier" element={<ImageEditor />} />
                <Route path="/audio-modifier" element={<AudioModifier />} />
                <Route path="/content-previewer" element={<ContentPreviewer />} />
                <Route path="/file-converter" element={<FileConverter />} />
                <Route path="/fluxkit" element={<FluxKitHome />} />
                <Route path="/fluxkit/data-structure" element={<DataStructure />} />
                <Route path="/fluxkit/web-dev-assets" element={<WebDevAssets />} />
                <Route path="/fluxkit/security-logic" element={<SecurityLogic />} />
                <Route path="/fluxkit/productivity"    element={<Productivity />} />
                <Route path="/fluxkit/latex-builder"  element={<LaTeXBuilder />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
        </SettingsProvider>
        </ToolThemeProvider>
        </BrandingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
