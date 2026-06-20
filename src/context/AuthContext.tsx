import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, DEFAULT_USER } from '../services/supabase';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(DEFAULT_USER);
  const loading = false;

  useEffect(() => {
    // Check initial session
    authService.getCurrentUser()
      .then(currentUser => {
        setUser(currentUser || DEFAULT_USER);
      })
      .catch(err => {
        console.error('Error fetching initial user:', err);
        setUser(DEFAULT_USER);
      });

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user || session || DEFAULT_USER);
      } else {
        setUser(DEFAULT_USER);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    if (loggedInUser) {
      setUser(loggedInUser);
    }
    return loggedInUser;
  };

  const signUp = async (email: string, password: string) => {
    const signedUpUser = await authService.signUp(email, password);
    if (signedUpUser) {
      setUser(signedUpUser);
    }
    return signedUpUser;
  };

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  const logout = async () => {
    await authService.logout();
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser || DEFAULT_USER);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

