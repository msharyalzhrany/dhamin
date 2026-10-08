// خطّاف بسيط لجلب البيانات:  const { data, loading, error, reload } = useApi<T>('/properties')
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

export function useApi<T = any>(path: string | null, opts: { poll?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!!path);
  const seq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!path) return;
    const my = ++seq.current;
    if (!silent) setLoading(true);
    try {
      const d = await api<T>(path);
      if (my === seq.current) { setData(d); setError(null); }
    } catch (e) {
      if (my === seq.current) setError(e);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => {
    if (!opts.poll || !path) return;
    const id = setInterval(() => load(true), opts.poll);
    return () => clearInterval(id);
  }, [opts.poll, path, load]);

  return { data, error, loading, reload: () => load(true), setData };
}
