'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, SESSION_ENDED_EVENT, SESSION_STORAGE_KEYS } from '@/lib/api-client';
import { can as canWith, loginPathFor, type AccessPermission } from '@/lib/rbac';
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
  /** Accepts a staff invitation (`POST /auth/setup-password`) and signs it in. */
  acceptInvite: (
    token: string,
    password: string,
  ) => Promise<{ user: AuthUser; school: SchoolProfile | null }>;
  /** Creates a parent account (`POST /auth/register-parent`) and signs it in. */
  registerParent: (input: ParentRegistration) => Promise<{ user: AuthUser }>;
  logout: () => void;
  refreshSchool: () => Promise<SchoolProfile | null>;
  can: (permission: AccessPermission) => boolean;
}

export interface ParentRegistration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: unknown;
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

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // The server ended the session (refresh rejected): sign this tab out
  // without a reload; RouteGuard sends the user to sign in and back.
  useEffect(() => {
    const onEnded = () => {
      setUser(null);
      setSchool(null);
    };
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  // Tabs share one stored session. When another tab signs out, follow it;
  // when another tab signs in as someone else, reload so this tab can't keep
  // showing one person while acting as another. (The signing-in tab already
  // cleared the previous user's caches.)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEYS.user && event.key !== null) return;
      const next = event.key === null ? null : event.newValue;
      if (!next) {
        setUser(null);
        setSchool(null);
        return;
      }
      let nextId: string | undefined;
      try {
        nextId = parseAuthUser(JSON.parse(next))?.id;
      } catch {
        nextId = undefined;
      }
      const current = userRef.current;
      if (current && nextId !== current.id) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * Starts a session from a login-shaped response, after dropping any previous
   * user's data. Loading stays on until `finish` has loaded the rest of the session.
   */
  const signIn = async <R,>(
    request: () => Promise<{ data: LoginResponse }>,
    finish: (user: AuthUser) => Promise<R>,
  ): Promise<R> => {
    setIsLoading(true);
    // Drop anything cached from a previous user before the new session starts.
    endSession();
    try {
      const res = await request();
      const authUser = parseAuthUser(res.data.user);
      if (!authUser) throw new Error(UNRECOGNISED_ROLE_MESSAGE);

      apiClient.setTokens(res.data.accessToken, res.data.refreshToken);
      localStorage.setItem(SESSION_STORAGE_KEYS.user, JSON.stringify(authUser));
      setUser(authUser);
      return await finish(authUser);
    } finally {
      setIsLoading(false);
    }
  };

  /** Loads a school user's profile and modules once their session has started. */
  const loadSchoolSession = async (authUser: AuthUser) => {
    if (!authUser.schoolId) return { user: authUser, school: null };
    const [schoolProfile, modules] = await Promise.all([
      fetchSchoolProfile(authUser.schoolId),
      fetchModules(),
    ]);
    return { user: { ...authUser, modules }, school: schoolProfile };
  };

  const login = (email: string, password: string) =>
    signIn(
      () => apiClient.post<LoginResponse>('/auth/login', { email, password }),
      loadSchoolSession,
    );

  // The setup response is already a sign-in, so no second login is needed.
  const acceptInvite = (token: string, password: string) =>
    signIn(
      () => apiClient.post<LoginResponse>('/auth/setup-password', { token, password }),
      loadSchoolSession,
    );

  const registerParent = (input: ParentRegistration) =>
    signIn(
      () => apiClient.post<LoginResponse>('/auth/register-parent', input),
      async (authUser) => ({ user: authUser }),
    );

  const logout = () => {
    apiClient.revokeSession();
    endSession();
    router.replace(loginPathFor(window.location.pathname));
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
        acceptInvite,
        registerParent,
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
