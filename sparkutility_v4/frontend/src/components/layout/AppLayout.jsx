import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import PWAInstall from './PWAInstall';
import PWALoadingBar from './PWALoadingBar';
import Sidebar from './Sidebar';
import SparkEngine from '@/components/SparkEngine';
import { SidebarProvider } from '@/context/SidebarContext';
import { useSettings } from '@/context/SettingsContext';

function AppLayoutInner() {
  const { settings } = useSettings();
  const showSidebar = settings.sidebarEnabled !== false;

  useEffect(() => {
    document.body.classList.toggle('dyslexia-font', !!settings.dyslexiaFont);
  }, [settings.dyslexiaFont]);

  return (
    <div className="min-h-screen flex flex-col">
      <PWALoadingBar />
      <Navbar />
      {/* Body: optional sidebar + scrolling page content */}
      <div className="flex flex-1 min-h-0">
        {showSidebar && <Sidebar />}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <PWAInstall />
      <Footer />
      {/* SparkEngine: global Ctrl/Cmd+K overlay — always mounted so the hotkey works anywhere */}
      <SparkEngine />
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutInner />
    </SidebarProvider>
  );
}
