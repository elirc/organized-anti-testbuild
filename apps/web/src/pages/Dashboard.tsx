import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface DashboardData {
  metrics: {
    activeWorkers: number;
    onboardingWorkers: number;
    blockedTasks: number;
    openSupportCases: number;
    payrollCyclesInReview: number;
    documentsPendingReview: number;
  };
  upcomingWorkers: {
    id: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    startDate: string;
    company: { name: string };
  }[];
  countryDistribution: {
    countryCode: string;
    count: number;
  }[];
  recentAuditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { firstName: string; email: string } | null;
  }[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)' }}>
        <h4>Failed to load dashboard metrics</h4>
        <p>{(error as any)?.response?.data?.message || 'Check database connection'}</p>
      </div>
    );
  }

  const { metrics, upcomingWorkers, countryDistribution, recentAuditLogs } = data;

  const totalWorkersCount = metrics.activeWorkers + metrics.onboardingWorkers;

  return (
    <div>
      {/* Welcome page header */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--neutral-900)' }}>
            Welcome back, {user?.firstName} 👋
          </h1>
          <p style={{ color: 'var(--neutral-500)', marginTop: '0.25rem', fontWeight: 500 }}>
            Here is what is happening across your global workforce lifecycle today.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: 'var(--brand-500)' }} />
          <span style={{ fontSize: '1.5rem' }}>👷</span>
          <span style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Managed Workforce
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
            {totalWorkersCount}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
            <span>🟢 <b>{metrics.activeWorkers}</b> Active</span>
            <span>🟡 <b>{metrics.onboardingWorkers}</b> Onboarding</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: metrics.blockedTasks > 0 ? 'var(--danger-text)' : 'var(--success-text)' }} />
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <span style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Compliance Tasks Status
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1, color: metrics.blockedTasks > 0 ? 'var(--danger-text)' : 'inherit' }}>
            {metrics.blockedTasks}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
            {metrics.blockedTasks > 0 ? '⚠️ Critical task blockers require review' : '✅ All task pipelines are moving smoothly'}
          </span>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', backgroundColor: 'var(--pending-text)' }} />
          <span style={{ fontSize: '1.5rem' }}>💬</span>
          <span style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Open Support Tickets
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>
            {metrics.openSupportCases}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
            Active worker & client query tickets
          </span>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--pending-bg)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>📁</span>
          </div>
          <div>
            <h4 style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Pending Document Approvals
            </h4>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.125rem' }}>
              {metrics.documentsPendingReview}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
          </div>
          <div>
            <h4 style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Payroll Cycles In Review
            </h4>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.125rem' }}>
              {metrics.payrollCyclesInReview}
            </h3>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--info-bg)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>🌎</span>
          </div>
          <div>
            <h4 style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Global Countries Active
            </h4>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.125rem' }}>
              {countryDistribution.length}
            </h3>
          </div>
        </div>
      </div>

      {/* Main split sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* Left column: Upcoming workers & recent audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Upcoming Starters */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚀</span> Upcoming Workforce Onboarding Starters
            </h3>
            
            <Table
              columns={[
                {
                  header: 'Worker Name',
                  render: (row) => (
                    <div style={{ fontWeight: 600 }}>
                      {row.firstName} {row.lastName}
                    </div>
                  ),
                },
                {
                  header: 'Job Title & Company',
                  render: (row) => (
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>{row.jobTitle}</div>
                      <div style={{ color: 'var(--neutral-400)' }}>{row.company.name}</div>
                    </div>
                  ),
                },
                {
                  header: 'Start Date',
                  render: (row) => (
                    <span style={{ fontWeight: 500 }}>
                      {new Date(row.startDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ),
                },
              ]}
              data={upcomingWorkers}
              emptyMessage="No upcoming employees found in this cycle."
              pageSize={3}
            />
          </div>

          {/* Recent Audit Timeline */}
          {(user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS) && (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📜</span> Recent Compliance Operations Logs
                </h3>
                <Link to="/audit-logs" style={{ fontSize: '0.8rem', color: 'var(--brand-600)', fontWeight: 600 }}>
                  View All logs →
                </Link>
              </div>

              <Table
                columns={[
                  {
                    header: 'Action log',
                    render: (row) => (
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {row.action}
                      </span>
                    ),
                  },
                  {
                    header: 'Actor',
                    render: (row) => (
                      <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>
                        {row.actor ? `${row.actor.firstName}` : 'System'}
                      </span>
                    ),
                  },
                  {
                    header: 'Date & Time',
                    render: (row) => (
                      <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    ),
                  },
                ]}
                data={recentAuditLogs}
                emptyMessage="No audit operations logs recorded."
                pageSize={3}
              />
            </div>
          )}
        </div>

        {/* Right column: Country stats distribution */}
        <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🌍</span> Country Allocation
          </h3>
          
          {countryDistribution.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
              No worker distribution data.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {countryDistribution.map((item) => {
                const percentage = totalWorkersCount > 0 ? Math.round((item.count / totalWorkersCount) * 100) : 0;
                return (
                  <div key={item.countryCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--neutral-700)' }}>
                        🏁 {item.countryCode === 'US' ? 'United States (US)' : item.countryCode === 'GB' ? 'United Kingdom (GB)' : item.countryCode === 'DE' ? 'Germany (DE)' : item.countryCode}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--neutral-500)' }}>
                        {item.count} worker{item.count > 1 ? 's' : ''} ({percentage}%)
                      </span>
                    </div>
                    {/* Progress slider bar */}
                    <div style={{ height: '6px', backgroundColor: 'var(--neutral-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
