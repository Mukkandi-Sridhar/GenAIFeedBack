import { useState, useCallback } from 'react';

const SESSION_KEY = 'dfa19_admin_token';
const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export function useAdminSession() {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      const { expires_at } = JSON.parse(raw);
      return Date.now() < expires_at;
    } catch {
      return false;
    }
  });

  const login = useCallback(() => {
    const session = {
      token: crypto.randomUUID(),
      expires_at: Date.now() + SESSION_TTL_MS,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setIsAuthed(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
  }, []);

  return { isAuthed, login, logout };
}
