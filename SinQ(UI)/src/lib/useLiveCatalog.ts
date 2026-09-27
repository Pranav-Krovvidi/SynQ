'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function useLiveCatalog<T>(path: string, intervalMs = 15000) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setData([]);
      setError(null);
      setLoading(true);
      return;
    }

    let active = true;
    let requestPending = false;

    const refresh = async () => {
      if (requestPending) return;
      requestPending = true;
      try {
        const result = await apiFetch<T[]>(path);
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        const message = (err as Error).message;
        if (active && message.startsWith('API 403:') && message.includes('Not authenticated')) {
          localStorage.removeItem('synq_jwt');
          localStorage.removeItem('synq_auth');
          localStorage.removeItem('synq_project');
          window.location.assign('/login');
          return;
        }
        if (active) setError(message);
      } finally {
        requestPending = false;
        if (active) setLoading(false);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [path, intervalMs, isAuthenticated]);

  return { data, loading, error };
}
/**
 * Catalog rows narrowed to the project selected in the sidebar.
 *
 * The catalog endpoints return every project the user can see, so switching
 * projects is a filter over data already in memory — the list re-derives on the
 * same tick as the switch instead of waiting for the next poll.
 *
 * `scopedToProject` reports whether a project filter was actually applied, so
 * callers can distinguish "this project has none" from "no project selected".
 */
export function useProjectCatalog<T extends { project_id: string }>(
  path: string,
  intervalMs = 15000
) {
  const { currentProject } = useAuth();
  const { data, loading, error } = useLiveCatalog<T>(path, intervalMs);

  const projectId = currentProject?.id ?? null;
  const scoped = useMemo(
    () => (projectId ? data.filter((row) => row.project_id === projectId) : data),
    [data, projectId]
  );

  return { data: scoped, allData: data, loading, error, scopedToProject: !!projectId };
}
