import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@gwos/shared';
import api from '../services/api';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export const Layout: React.FC = () => {
  const { user, logout, switchTenant, activeTenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState<TenantOption[]>([]);

  // Fetch all tenants if platform role to populate tenant-switcher dropdown
  useEffect(() => {
    const fetchTenantsList = async () => {
      if (user && (user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.INTERNAL_OPS)) {
        try {
          const response = await api.get('/tenants');
          setTenants(response.data);
        } catch (err) {
          console.error('Failed to load tenants selector options:', err);
        }
      }
    };
    fetchTenantsList();
  }, [user]);

  if (!user) return null;

  const isPlatformUser = user.role === UserRole.PLATFORM_ADMIN || user.role === UserRole.INTERNAL_OPS;

  // Compile active link style
  const linkStyle = (path: string): React.CSSProperties => {
    const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return {
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: '0.9rem',
      fontWeight: 500,
      gap: '0.75rem',
      color: active ? 'white' : 'var(--neutral-300)',
      backgroundColor: active ? 'var(--brand-600)' : 'transparent',
      transition: 'var(--transition-smooth)',
    };
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--neutral-50)' }}>
      {/* Sidebar Nav */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--neutral-950)',
          color: 'var(--neutral-100)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 10,
          padding: '1.5rem 1rem',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Brand header */}
        <div style={{ padding: '0 0.5rem 2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>🌐</span>
          <div>
            <h3 style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.1 }}>
              GlobalWorkforce
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--brand-500)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Operations OS
            </span>
          </div>
        </div>

        {/* Dynamic menu items depending on RBAC roles */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, overflowY: 'auto' }} className="sidebar-nav">
          {/* Platforms roles (Platform Admin & Ops) */}
          {isPlatformUser && (
            <>
              <Link to="/dashboard" style={linkStyle('/dashboard')}><span>📊</span> Dashboard</Link>
              <Link to="/companies" style={linkStyle('/companies')}><span>🏢</span> Clients</Link>
              <Link to="/workers" style={linkStyle('/workers')}><span>👷</span> Workforce</Link>
              <Link to="/contracts" style={linkStyle('/contracts')}><span>✏️</span> Contracts</Link>
              <Link to="/documents" style={linkStyle('/documents')}><span>📁</span> Documents Queue</Link>
              <Link to="/payroll" style={linkStyle('/payroll')}><span>💰</span> Payroll</Link>
              <Link to="/support-cases" style={linkStyle('/support-cases')}><span>💬</span> Support Cases</Link>
              <Link to="/audit-logs" style={linkStyle('/audit-logs')}><span>📜</span> Audit Activity</Link>
            </>
          )}

          {/* Client Admin / Client HR */}
          {(user.role === UserRole.CLIENT_ADMIN || user.role === UserRole.CLIENT_HR) && (
            <>
              <Link to="/dashboard" style={linkStyle('/dashboard')}><span>📊</span> Dashboard</Link>
              <Link to="/companies" style={linkStyle('/companies')}><span>🏢</span> Company Profile</Link>
              <Link to="/workers" style={linkStyle('/workers')}><span>👷</span> Workforce</Link>
              <Link to="/contracts" style={linkStyle('/contracts')}><span>✏️</span> Contracts</Link>
              <Link to="/payroll" style={linkStyle('/payroll')}><span>💰</span> Payroll Hub</Link>
              <Link to="/support-cases" style={linkStyle('/support-cases')}><span>💬</span> Support Center</Link>
            </>
          )}

          {/* Worker Menu */}
          {user.role === UserRole.WORKER && (
            <>
              <Link to={`/workers/${user.workerId}`} style={linkStyle(`/workers/${user.workerId}`)}><span>👤</span> My Profile</Link>
              <Link to="/support-cases" style={linkStyle('/support-cases')}><span>💬</span> Get Support</Link>
            </>
          )}
        </nav>

        {/* Sidebar Footer User detail */}
        <div
          style={{
            padding: '1rem 0.5rem 0 0.5rem',
            borderTop: '1px solid var(--neutral-800)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--brand-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'white',
              fontFamily: 'var(--font-display)',
            }}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.firstName} {user.lastName}
            </h4>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <div style={{ flex: 1, marginLeft: 'var(--sidebar-width)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header
          style={{
            height: 'var(--header-height)',
            backgroundColor: 'white',
            borderBottom: '1px solid var(--neutral-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2rem',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          {/* Tenant switch context or standard title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {isPlatformUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Active Tenant:
                </span>
                <select
                  value={activeTenantId || ''}
                  onChange={(e) => switchTenant(e.target.value || null)}
                  style={{
                    padding: '0.4rem 2rem 0.4rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--neutral-200)',
                    backgroundColor: 'var(--neutral-50)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">🌎 Platform-Wide view</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      🏢 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🏢</span>
                <span style={{ fontWeight: 600, color: 'var(--neutral-800)', fontSize: '0.95rem' }}>
                  {user.tenantName || 'GlobalWorkforce Client'}
                </span>
              </div>
            )}
          </div>

          {/* Quick tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main style={{ flex: 1, padding: '2rem', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>
      <style>{`
        .sidebar-nav a:hover {
          color: white !important;
          background-color: var(--neutral-800) !important;
        }
      `}</style>
    </div>
  );
};
