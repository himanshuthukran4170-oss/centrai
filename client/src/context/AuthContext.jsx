/**
 * AuthContext.jsx — Authentication context & state management
 */
import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage or verify session
    const stored = localStorage.getItem('centralign_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('centralign_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await apiClient.post('/login', { username, password });
    const userData = res.data.user || { username };
    setUser(userData);
    localStorage.setItem('centralign_user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.get('/logout');
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem('centralign_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
