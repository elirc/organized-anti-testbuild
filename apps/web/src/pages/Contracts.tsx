import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Table } from '../components/Table';
import { Badge } from '../components/Badge';

interface ContractRecord {
  id: string;
  workerId: string;
  contractType: string;
  status: string;
  compensationAmount: number;
  compensationCurrency: string;
  effectiveDate: string;
  worker: {
    firstName: string;
    lastName: string;
    email: string;
  };
  country: {
    name: string;
  };
}

export const Contracts: React.FC = () => {
  const navigate = useNavigate();

  const { data: contracts = [], isLoading } = useQuery<ContractRecord[]>({
    queryKey: ['contractsList'],
    queryFn: async () => {
      const response = await api.get('/contracts');
      return response.data;
    },
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Employment Contracts Ledger</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Monitor regulatory agreements, pay rates, and contract execution status globally.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <Table
          columns={[
            {
              header: 'Employee Name',
              render: (row) => (
                <div
                  onClick={() => navigate(`/workers/${row.workerId}`)}
                  style={{ fontWeight: 600, color: 'var(--brand-600)', cursor: 'pointer' }}
                  className="hover-underline"
                >
                  👤 {row.worker.firstName} {row.worker.lastName}
                </div>
              ),
            },
            {
              header: 'Contract Type',
              render: (row) => (
                <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                  💼 {row.contractType.replace(/_/g, ' ').toLowerCase()}
                </span>
              ),
            },
            {
              header: 'Assigned Country',
              render: (row) => (
                <span style={{ fontSize: '0.9rem', color: 'var(--neutral-700)' }}>
                  🏁 {row.country.name}
                </span>
              ),
            },
            {
              header: 'Gross Salary (Monthly)',
              render: (row) => (
                <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>
                  {row.compensationCurrency} {row.compensationAmount.toLocaleString()}
                </span>
              ),
            },
            {
              header: 'Effective Date',
              render: (row) => (
                <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>
                  📅 {new Date(row.effectiveDate).toLocaleDateString()}
                </span>
              ),
            },
            {
              header: 'Execution Status',
              render: (row) => <Badge status={row.status} />,
            },
          ]}
          data={contracts}
          emptyMessage="No employment contracts recorded."
          pageSize={6}
        />
      </div>
    </div>
  );
};
