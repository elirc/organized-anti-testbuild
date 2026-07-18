import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { LoginInput, UserRole } from '@gwos/shared';

interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenantName: string | null;
  workerId: string | null;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTenantId: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string | null) => void;
  checkRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('gwos_token');
      const savedUser = localStorage.getItem('gwos_user');
      const savedTenantId = localStorage.getItem('gwos_active_tenant_id');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setActiveTenantId(savedTenantId);
          
          // Verify session freshness with /auth/me
          const response = await api.get('/auth/me');
          const freshUser = {
            id: response.data.id,
            email: response.data.email,
            role: response.data.role,
            tenantId: response.data.tenantId,
            tenantName: response.data.tenant?.name || null,
            workerId: response.data.workerId,
            firstName: response.data.firstName,
            lastName: response.data.lastName,
          };
          setUser(freshUser);
          localStorage.setItem('gwos_user', JSON.stringify(freshUser));
        } catch (err) {
          console.error('Session restoration failed:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', input);
      const { accessToken, user: loggedUser } = response.data;

      localStorage.setItem('gwos_token', accessToken);
      localStorage.setItem('gwos_user', JSON.stringify(loggedUser));
      
      setUser(loggedUser);
      
      // Default active tenant is user's own tenant
      if (loggedUser.tenantId) {
        localStorage.setItem('gwos_active_tenant_id', loggedUser.tenantId);
        setActiveTenantId(loggedUser.tenantId);
      } else {
        localStorage.removeItem('gwos_active_tenant_id');
        setActiveTenantId(null);
      }
    } catch (err) {
      logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gwos_token');
    localStorage.removeItem('gwos_user');
    localStorage.removeItem('gwos_active_tenant_id');
    setUser(null);
    setActiveTenantId(null);
  };

  const switchTenant = (tenantId: string | null) => {
    if (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS) {
      if (tenantId) {
        localStorage.setItem('gwos_active_tenant_id', tenantId);
        setActiveTenantId(tenantId);
      } else {
        localStorage.removeItem('gwos_active_tenant_id');
        setActiveTenantId(null);
      }
      // Force reload page to clear react-query cache and fetch the target tenant context
      window.location.reload();
    }
  };

  const checkRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === UserRole.PLATFORM_ADMIN) return true; // Platform Admins are superusers
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeTenantId,
        login,
        logout,
        switchTenant,
        checkRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
