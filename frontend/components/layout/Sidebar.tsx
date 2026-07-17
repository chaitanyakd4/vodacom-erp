'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Package,
  FileText, ShieldCheck, LogOut, Zap, Wrench, Megaphone,
  PackageCheck, UserCog
} from 'lucide-react';
import clsx from 'clsx';
import { usePermissions } from '../../hooks/usePermissions';

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { href: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard, module: 'dashboard' },
  { href: '/customers',  label: 'Customers',         icon: Users,           module: 'customers' },
  { href: '/products',   label: 'Inventory',         icon: Package,         module: 'products' },
  { href: '/challan',    label: 'Delivery Challans', icon: PackageCheck,    module: 'challan' },
  { href: '/invoices',   label: 'Invoices',          icon: FileText,        module: 'invoices' },
];

const NAV_SERVICES = [
  { href: '/amc',          label: 'AMC Contracts',   icon: ShieldCheck, module: 'amc' },
  { href: '/service-work', label: 'Service Work',    icon: Wrench,      module: 'service-work' },
  { href: '/enquiries',    label: 'Sales Enquiries', icon: Megaphone,   module: 'enquiries' },
];

const NAV_ADMIN = [
  { href: '/users', label: 'User Management', icon: UserCog, module: 'admin' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: {
    email: string;
    id: number;
    name?: string;
    role?: string;
    is_superadmin?: boolean;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { canAccess, isSuperadmin } = usePermissions();

  const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const initials = user?.email
    ? user.email.split('@')[0].slice(0, 2).toUpperCase()
    : 'VT';

  const displayName = user?.email
    ? user.email.split('@')[0]
    : 'Admin User';

  // Filter nav items based on permissions
  const visibleMain     = NAV_MAIN.filter(item => canAccess(item.module));
  const visibleServices = NAV_SERVICES.filter(item => canAccess(item.module));

  return (
    <aside className="w-[240px] min-h-screen bg-vodacom-darker flex flex-col flex-shrink-0 border-r border-white/5">

      {/* ── Logo ── */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[36px] bg-vodacom-blue/20 border border-vodacom-blue/40 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-vodacom-blue/10">
            <Zap size={18} className="text-vodacom-green" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-wider leading-none">
              <span className="text-white">Voda</span>
              <span className="text-vodacom-green">com</span>
            </div>
            <div className="text-[9px] text-vodacom-muted uppercase tracking-[0.2em] font-semibold mt-1">
              ERP SYSTEM
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {visibleMain.length > 0 && (
          <NavSection label="Main Operations">
            {visibleMain.map(item => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
            ))}
          </NavSection>
        )}

        {visibleServices.length > 0 && (
          <NavSection label="Services">
            {visibleServices.map(item => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
            ))}
          </NavSection>
        )}

        {/* Admin section — only for superadmins */}
        {isSuperadmin && (
          <NavSection label="Admin">
            {NAV_ADMIN.map(item => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} />
            ))}
          </NavSection>
        )}
      </nav>

      {/* ── User Profile Block ── */}
      <div className="px-4 py-4 border-t border-white/5 bg-vodacom-dark/40">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 bg-vodacom-surface border border-white/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[12px] font-bold text-vodacom-green tracking-wider">{initials}</span>
          </div>
          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white truncate capitalize">
              {displayName}
            </div>
            <div className="text-[10px] text-vodacom-muted uppercase tracking-wider font-medium">
              {isSuperadmin ? 'Superadmin' : 'Staff'}
            </div>
          </div>
          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-vodacom-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-3 pb-2 text-[10px] font-semibold text-vodacom-muted uppercase tracking-[0.15em]">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 border border-transparent',
        active
          ? 'bg-vodacom-blue/15 text-white border-white/5'
          : 'text-vodacom-muted hover:bg-vodacom-surface/50 hover:text-white'
      )}
    >
      {/* Active side indicator */}
      {active && (
        <span className="absolute left-0 top-[8px] bottom-[8px] w-[3px] bg-vodacom-green rounded-r-full shadow-lg shadow-vodacom-green/50" />
      )}

      <Icon
        size={16}
        className={clsx('flex-shrink-0 transition-colors duration-200', active ? 'text-vodacom-green' : 'text-vodacom-muted group-hover:text-white')}
      />
      <span className="flex-1 tracking-wide">{label}</span>
    </Link>
  );
}