import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { initializeE2EE } from '../crypto';

type User = {
  id: number;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Register the user's ECDH public key with the server.
 * Called by initializeE2EE only when a NEW key pair is generated.
 */
async function registerPublicKey(publicKeyJwk: string): Promise<void> {
  await api.post('/e2ee/register-key', { public_key_jwk: publicKeyJwk });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/auth/me');
      setUser(res.data);

      // Initialize E2EE keys (idempotent — skips if keys already exist in IndexedDB)
      try {
        await initializeE2EE(res.data.id, registerPublicKey);
      } catch (e2eeErr) {
        console.warn('[E2EE] Key initialization failed (non-blocking):', e2eeErr);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (_token: string, userData: User) => {
    // We don't save token to localStorage because it's in HttpOnly cookie now.
    // We just set user.
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch(e) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
