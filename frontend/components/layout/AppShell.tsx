'use client';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions, ALL_MODULES } from '../../hooks/usePermissions';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AccessDenied } from '../AccessDenied';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const { canAccessPath, isSuperadmin } = usePermissions();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isUsersPath = pathname.startsWith('/users');

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-vodacom-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-vodacom-blue border-t-vodacom-green rounded-full animate-spin" />
          <span className="text-sm text-vodacom-muted font-medium animate-pulse">Loading Vodacom ERP…</span>
        </div>
      </div>
    );
  }

  if (!user && isPublicPath) return <>{children}</>;
  if (!user) return null;

  // Block non-superadmins from /users
  const isUsersMgmtBlocked = isUsersPath && !isSuperadmin;

  // Block access to restricted modules
  const moduleInfo = ALL_MODULES.find(m => pathname === m.path || pathname.startsWith(m.path + '/'));
  const isModuleBlocked = moduleInfo ? !canAccessPath(pathname) : false;

  const isBlocked = isUsersMgmtBlocked || isModuleBlocked;
  const blockedPageName = isUsersMgmtBlocked
    ? 'User Management'
    : moduleInfo?.label;

  return (
    <div className="flex h-screen bg-vodacom-dark text-vodacom-text overflow-hidden">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-7 bg-gradient-to-br from-vodacom-dark to-vodacom-darker">
          {isBlocked ? <AccessDenied pageName={blockedPageName} /> : children}
        </main>
      </div>
    </div>
  );
}

import { NotificationDrawer } from './NotificationDrawer';

// ── Top bar ──────────────────────────────────────────────────────────────────

function TopBar() {
  const pathname = usePathname();

  const pageTitle: Record<string, string> = {
    '/dashboard': 'Dashboard Overview',
    '/customers': 'Customer Directory',
    '/products':  'Inventory Management',
    '/invoices':  'Invoices & Billing',
    '/amc':       'AMC Contracts',
    '/service-work': 'Service Work Tracker',
    '/enquiries': 'Sales Enquiries & Quotes',
    '/challan':   'Delivery Challans',
    '/users':     'User Management',
  };

  const title =
    Object.entries(pageTitle).find(([path]) => pathname.startsWith(path))?.[1]
    ?? 'Vodacom ERP';

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-vodacom-darker border-b border-white/5 px-7 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-[16px] font-bold text-white leading-tight tracking-wide">
          {title}
        </h1>
        <p className="text-[11px] text-vodacom-muted mt-0.5">
          Vodacom Technologies Pvt. Ltd.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[12px] text-vodacom-muted hidden md:block font-medium">{today}</span>
        <NotificationDrawer />
      </div>
    </header>
  );
}