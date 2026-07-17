import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export function useEnquiries() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/sales/enquiries');
      setEnquiries(res.data);
    } catch (error) {
      console.error('Failed to fetch sales enquiries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  return { enquiries, loading, refetch: fetchEnquiries };
}
