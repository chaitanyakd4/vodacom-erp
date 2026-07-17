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

    api.get('/api/auth/me')
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
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}
