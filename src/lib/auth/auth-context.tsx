'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, SESSION_STORAGE_KEYS } from '@/lib/api-client';
import { can as canWith, LOGIN_PATH, type AccessPermission } from '@/lib/rbac';
import {
  parseAuthUser,
  parseEnabledModules,
  UNRECOGNISED_ROLE_MESSAGE,
  type AuthUser,
  type SchoolProfile,
} from './session';

interface AuthContextType {
  user: AuthUser | null;
  school: SchoolProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ user: AuthUser; school: SchoolProfile | null }>;
  logout: () => void;
  refreshSchool: () => Promise<SchoolProfile | null>;
  can: (permission: AccessPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const endSession = useCallback(() => {
    apiClient.clearSession();
    setUser(null);
    setSchool(null);
  }, []);

  /**
   * Loads the profile of the user's own school. A profile for any other
   * tenant means the session is inconsistent, so it is ended rather than shown.
   */
  const fetchSchoolProfile = useCallback(
    async (schoolId: string): Promise<SchoolProfile | null> => {
      try {
        const res = await apiClient.get<SchoolProfile>('/schools/me');
        if (!res.data) return null;
        if (res.data.id !== schoolId) {
          endSession();
          return null;
        }
        setSchool(res.data);
        localStorage.setItem(SESSION_STORAGE_KEYS.school, JSON.stringify(res.data));
        return res.data;
      } catch {
        return null;
      }
    },
    [endSession],
  );

  /**
   * Loads the modules enabled for the user's school onto the session, so
   * pages of a disabled module are hidden. On failure they stay unknown and
   * the backend's module guard decides.
   */
  const fetchModules = useCallback(async (): Promise<AuthUser['modules']> => {
    try {
      const res = await apiClient.get('/schools/me/modules?limit=100');
      const modules = parseEnabledModules(res.data);
      setUser((current) => (current ? { ...current, modules } : current));
      return modules;
    } catch {
      return undefined;
    }
  }, []);

  // Restore a stored session on first mount. A school user stays loading
  // until their school's modules are known, so no page shows and then vanishes.
  useEffect(() => {
    let restored: AuthUser | null = null;
    let cachedSchool: SchoolProfile | null = null;
    try {
      const storedUser = localStorage.getItem(SESSION_STORAGE_KEYS.user);
      restored =
        apiClient.getAccessToken() && storedUser ? parseAuthUser(JSON.parse(storedUser)) : null;
      const storedSchool = localStorage.getItem(SESSION_STORAGE_KEYS.school);
      cachedSchool = storedSchool ? (JSON.parse(storedSchool) as SchoolProfile) : null;
    } catch {
      restored = null;
    }
    if (!restored) {
      apiClient.clearSession();
      setIsLoading(false);
      return;
    }
    setUser(restored);
    if (!restored.schoolId) {
      setIsLoading(false);
      return;
    }
    if (cachedSchool?.id === restored.schoolId) setSchool(cachedSchool);
    fetchSchoolProfile(restored.schoolId);
    fetchModules().finally(() => setIsLoading(false));
  }, [fetchSchoolProfile, fetchModules]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Drop anything cached from a previous user before the new session starts.
    endSession();
    try {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: unknown;
      }>('/auth/login', { email, password });
      const authUser = parseAuthUser(res.data.user);
      if (!authUser) throw new Error(UNRECOGNISED_ROLE_MESSAGE);

      apiClient.setTokens(res.data.accessToken, res.data.refreshToken);
      localStorage.setItem(SESSION_STORAGE_KEYS.user, JSON.stringify(authUser));
      setUser(authUser);

      if (!authUser.schoolId) return { user: authUser, school: null };
      const [schoolProfile, modules] = await Promise.all([
        fetchSchoolProfile(authUser.schoolId),
        fetchModules(),
      ]);
      return { user: { ...authUser, modules }, school: schoolProfile };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    endSession();
    router.replace(LOGIN_PATH);
  };

  const refreshSchool = useCallback(
    async () => (user?.schoolId ? fetchSchoolProfile(user.schoolId) : null),
    [user, fetchSchoolProfile],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        school,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshSchool,
        can: (permission) => canWith(user, permission),
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
