'use client';
import { useAuth } from './useAuth';

// All available module slugs and their friendly labels
export const ALL_MODULES = [
  { slug: 'dashboard',    label: 'Dashboard',         path: '/dashboard' },
  { slug: 'customers',   label: 'Customers',          path: '/customers' },
  { slug: 'products',    label: 'Inventory',          path: '/products' },
  { slug: 'invoices',    label: 'Invoices & Billing', path: '/invoices' },
  { slug: 'challan',     label: 'Delivery Challans',  path: '/challan' },
  { slug: 'amc',         label: 'AMC Contracts',      path: '/amc' },
  { slug: 'service-work',label: 'Service Work',       path: '/service-work' },
  { slug: 'enquiries',   label: 'Sales Enquiries',    path: '/enquiries' },
] as const;

export type ModuleSlug = typeof ALL_MODULES[number]['slug'];

export function usePermissions() {
  const { user } = useAuth();

  const isSuperadmin: boolean = user?.is_superadmin === true;

  // Parse permissions string into a Set
  const allowedModules: Set<string> = (() => {
    if (!user) return new Set<string>();
    if (isSuperadmin) return new Set(ALL_MODULES.map(m => m.slug));
    const perms: string = user.permissions || 'all';
    if (perms === 'all') return new Set(ALL_MODULES.map(m => m.slug));
    return new Set(perms.split(',').map((s: string) => s.trim()).filter(Boolean));
  })();

  const canAccess = (moduleSlug: string): boolean => {
    if (isSuperadmin) return true;
    return allowedModules.has(moduleSlug);
  };

  // Given a pathname like '/dashboard' or '/customers/123', return the module slug
  const getModuleForPath = (pathname: string): string | null => {
    const match = ALL_MODULES.find(m => pathname === m.path || pathname.startsWith(m.path + '/'));
    return match ? match.slug : null;
  };

  const canAccessPath = (pathname: string): boolean => {
    const slug = getModuleForPath(pathname);
    if (!slug) return true; // Unknown path — allow (e.g., /login)
    return canAccess(slug);
  };

  return { canAccess, canAccessPath, isSuperadmin, allowedModules };
}
