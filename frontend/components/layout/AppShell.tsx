'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions, ALL_MODULES } from '../../hooks/usePermissions';
import { usePathname, useRouter } from 'next/navigation';
import { AccessDenied } from '../AccessDenied';
import { NotificationDrawer } from './NotificationDrawer';
import { Menu } from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const { canAccessPath, isSuperadmin } = usePermissions();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPath = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isUsersPath = pathname.startsWith('/users');

  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
      <Sidebar
        user={user}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full max-w-full">
        <TopBar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-gradient-to-br from-vodacom-dark to-vodacom-darker scroll-touch safe-area-bottom">
          {isBlocked ? <AccessDenied pageName={blockedPageName} /> : children}
        </main>
      </div>
    </div>
  );
}

// ── Top bar ──────────────────────────────────────────────────────────────────

function TopBar({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) {
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-vodacom-darker/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-6 lg:px-7 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 safe-area-top">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-vodacom-muted hover:text-white transition-colors"
          title="Open menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-sm sm:text-[16px] font-bold text-white leading-tight tracking-wide truncate max-w-[200px] sm:max-w-none">
            {title}
          </h1>
          <p className="text-[10px] text-vodacom-muted mt-0.5 hidden sm:block">
            Vodacom Technologies Pvt. Ltd.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <span className="text-[11px] sm:text-[12px] text-vodacom-muted hidden sm:block font-medium">{today}</span>
        <NotificationDrawer />
      </div>
    </header>
  );
}