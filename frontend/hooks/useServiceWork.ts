import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useServiceWork(statusFilter?: string) {
  const [serviceWork, setServiceWork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServiceWork = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/service-work/?status=${statusFilter}` : '/api/service-work/';
      const res = await api.get(url);
      setServiceWork(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceWork();
  }, [statusFilter]);

  return { serviceWork, loading, refetch: fetchServiceWork };
}
