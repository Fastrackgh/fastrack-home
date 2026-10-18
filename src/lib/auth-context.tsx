'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: string;
  userType?: string;
  schoolId?: string;
  permissions?: string[];
}

export interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  school: SchoolProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ user: AuthUser; school: SchoolProfile | null }>;
  logout: () => void;
  refreshSchool: () => Promise<SchoolProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchSchoolProfile = useCallback(async (): Promise<SchoolProfile | null> => {
    try {
      const res = await apiClient.get<SchoolProfile>('/schools/me');
      if (res.data) {
        setSchool(res.data);
        localStorage.setItem('fastrack_school', JSON.stringify(res.data));
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Hydrate on initial mount
  useEffect(() => {
    try {
      const storedToken = apiClient.getAccessToken();
      const storedUser = localStorage.getItem('fastrack_user');
      const storedSchool = localStorage.getItem('fastrack_school');

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setToken(storedToken);

        if (storedSchool) {
          setSchool(JSON.parse(storedSchool));
        }

        const role = parsedUser.role || parsedUser.userType;
        if (role !== 'SUPER_ADMIN') {
          fetchSchoolProfile();
        }
      }
    } catch {
      apiClient.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [fetchSchoolProfile]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>('/auth/login', { email, password });

      const { accessToken, refreshToken, user: authUser } = res.data;

      apiClient.setTokens(accessToken, refreshToken);
      localStorage.setItem('fastrack_user', JSON.stringify(authUser));

      setUser(authUser);
      setToken(accessToken);

      let schoolProfile: SchoolProfile | null = null;
      const role = authUser.role || authUser.userType;
      if (role !== 'SUPER_ADMIN') {
        schoolProfile = await fetchSchoolProfile();
      }

      return { user: authUser, school: schoolProfile };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.clearTokens();
    localStorage.removeItem('fastrack_user');
    localStorage.removeItem('fastrack_school');
    setUser(null);
    setSchool(null);
    setToken(null);
    router.push('/school-admin/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSchool: fetchSchoolProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
