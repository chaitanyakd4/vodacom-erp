import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useAmc() {
  const [amcs, setAmcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAmcs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/amc/');
      setAmcs(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmcs();
  }, []);

  return { amcs, loading, refetch: fetchAmcs };
}
