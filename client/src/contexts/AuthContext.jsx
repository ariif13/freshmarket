import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cek session di awal (kalau ada token, panggil /me)
  const bootstrap = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      tokenStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Auto-logout listener (dari api.js ketika dapat 401)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('freshmarket:unauthorized', handler);
    window.addEventListener('freshsayur:unauthorized', handler);
    return () => {
      window.removeEventListener('freshmarket:unauthorized', handler);
      window.removeEventListener('freshsayur:unauthorized', handler);
    };
  }, []);

  const login = async ({ email, password }) => {
    const data = await api.login({ email, password });
    tokenStorage.set(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async ({ name, email, password, phone }) => {
    const data = await api.register({ name, email, password, phone });
    tokenStorage.set(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

  const refreshMe = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      return data.user;
    } catch {
      logout();
      return null;
    }
  };

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await api.googleLogin(credential);
    tokenStorage.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const linkGoogle = useCallback(async (credential) => {
    const data = await api.googleLink(credential);
    try {
      const me = await api.getMe();
      setUser(me.user);
    } catch {
      logout();
    }
    return data;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
    login,
    register,
    loginWithGoogle,
    linkGoogle,
    logout,
    refreshMe
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
