import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Table } from '../components/Table';

interface AuditRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
  actor: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

export const AuditLogs: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery<AuditRecord[]>({
    queryKey: ['auditLogsList'],
    queryFn: async () => {
      const response = await api.get('/audit-logs');
      return response.data;
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Compliance Operations Audit Log</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Chronological audit trail recording all workforce activations, contract execution status, and document reviews.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <Table
          columns={[
            {
              header: 'Action / Event Type',
              render: (row) => (
                <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  ⚙️ {row.action}
                </span>
              ),
            },
            {
              header: 'Target Entity / Reference',
              render: (row) => (
                <span style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', fontWeight: 500 }}>
                  {row.entityType} ({row.entityId.substring(0, 8)}...)
                </span>
              ),
            },
            {
              header: 'Operator Actor',
              render: (row) => (
                <div style={{ fontSize: '0.85rem' }}>
                  {row.actor ? (
                    <>
                      <div style={{ fontWeight: 600 }}>{row.actor.firstName} {row.actor.lastName}</div>
                      <div style={{ color: 'var(--neutral-400)', fontSize: '0.75rem' }}>{row.actor.role}</div>
                    </>
                  ) : 'System Automated'}
                </div>
              ),
            },
            {
              header: 'Operation Metadata',
              render: (row) => (
                <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-500)', padding: '0.5rem', backgroundColor: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', maxWidth: '300px' }}>
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              ),
            },
            {
              header: 'Timestamp',
              render: (row) => (
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)' }}>
                  📅 {new Date(row.createdAt).toLocaleString()}
                </span>
              ),
            },
          ]}
          data={logs}
          emptyMessage="No audit operations logs recorded in this tenant context."
          pageSize={8}
        />
      </div>
    </div>
  );
};
