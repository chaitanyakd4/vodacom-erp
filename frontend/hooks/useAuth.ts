import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Abort controller with timeout to prevent infinite loading on Render cold starts
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s max wait

    api.get('/api/auth/me', { signal: controller.signal })
      .then(res => {
        setUser(res.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        // Let AppShell handle redirection based on path. Only redirect if not on a public path.
        const publicPaths = ['/login', '/forgot-password', '/reset-password'];
        if (typeof window !== 'undefined' && !publicPaths.includes(window.location.pathname)) {
          router.push('/login');
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [router]);

  return { user, loading };
}
