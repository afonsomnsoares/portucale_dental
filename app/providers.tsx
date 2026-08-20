'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch('/api/auth/csrf', { method: 'GET' }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data.user || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function getCookieValue(name) {
    if (typeof document === 'undefined') return null;
    const parts = String(document.cookie || '')
      .split(';')
      .map((s) => s.trim());
    for (const p of parts) {
      if (!p) continue;
      const idx = p.indexOf('=');
      const k = idx >= 0 ? p.slice(0, idx) : p;
      if (k !== name) continue;
      const v = idx >= 0 ? p.slice(idx + 1) : '';
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    }
    return null;
  }

  const api = useCallback(
    async (path, opts: Record<string, any> = {}) => {
      const method = String(opts.method || 'GET').toUpperCase();
      const isMutation = !(method === 'GET' || method === 'HEAD' || method === 'OPTIONS');
      const headers = {
        'Content-Type': 'application/json',
        ...opts.headers,
      };
      if (isMutation && !headers['x-csrf-token'] && !headers['X-CSRF-Token']) {
        let csrf = getCookieValue('dent_csrf');
        if (!csrf) {
          await fetch('/api/auth/csrf', { method: 'GET' }).catch(() => {});
          csrf = getCookieValue('dent_csrf');
        }
        if (csrf) headers['x-csrf-token'] = csrf;
      }
      const res = await fetch(`/api${path}`, {
        ...opts,
        credentials: 'same-origin',
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        let message = res.statusText;
        let code = null;
        let details = null;
        if (contentType.includes('application/json')) {
          const err = await res.json().catch(() => null);
          code = err?.code || null;
          details = err?.details ?? null;
          message = err?.message || err?.error || message;
        } else {
          const text = await res.text().catch(() => '');
          if (text) message = text;
        }
        const suffix = details ? ` (${typeof details === 'string' ? details : JSON.stringify(details)})` : '';
        throw new Error(
          `${method} /api${path} → ${res.status} ${code ? `${code}: ` : ''}${message || 'Request failed'}${suffix}`,
        );
      }
      return res.json();
    },
    [getCookieValue],
  );

  useEffect(() => {
    if (user && !settings) {
      api('/settings').then(setSettings).catch(console.error);
    }
  }, [user, settings, api]);

  const login = useCallback((u) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setSettings(null);
  }, [api]);

  return <AuthCtx.Provider value={{ user, loading, login, logout, api, settings }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
