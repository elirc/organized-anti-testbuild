import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyCreateSchema, CompanyCreateInput, UserRole } from '@gwos/shared';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import { useAuth } from '../context/AuthContext';

interface Company {
  id: string;
  tenantId: string;
  name: string;
  legalName: string;
  industry: string;
  headquartersCountry: string;
  status: string;
  primaryContactName: string;
  primaryContactEmail: string;
  workers?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    employmentStatus: string;
  }[];
}

export const Companies: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // 1. Fetch Companies
  const { data: companies = [], isLoading, error } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies');
      return response.data;
    },
  });

  // 2. Fetch Selected Company Detail (to display workers)
  const { data: selectedCompany, isLoading: isDetailLoading } = useQuery<Company>({
    queryKey: ['companyDetail', selectedCompanyId],
    queryFn: async () => {
      const response = await api.get(`/companies/${selectedCompanyId}`);
      return response.data;
    },
    enabled: !!selectedCompanyId,
  });

  // 3. Create Company Mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (input: CompanyCreateInput & { tenantId?: string }) => {
      return api.post('/companies', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowCreateForm(false);
      reset();
    },
    onError: (err: any) => {
      setCreationError(err.response?.data?.message || 'Failed to create company');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyCreateInput & { tenantId?: string }>({
    resolver: zodResolver(CompanyCreateSchema),
  });

  const onSubmit = (data: CompanyCreateInput & { tenantId?: string }) => {
    setCreationError(null);
    // If platform admin and no tenantId supplied in workspace, we let TenantGuard throw or bind default
    createCompanyMutation.mutate(data);
  };

  const handleSelectCompany = (id: string) => {
    setSelectedCompanyId(id);
    setShowCreateForm(false);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isPlatformRole = user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS;
  const canAddCompany = user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS || user?.role === UserRole.CLIENT_ADMIN;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Client Corporate Profiles</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Manage client entity structures, compliance countries, and operations.
          </p>
        </div>
        {canAddCompany && !showCreateForm && (
          <button onClick={() => { setShowCreateForm(true); setSelectedCompanyId(null); }} className="btn btn-primary">
            ➕ Add Client Entity
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        {/* Left Column: Companies List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>📂</span> Directory ({companies.length})
            </h3>
            
            {companies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
                No corporate clients found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {companies.map((c) => {
                  const active = c.id === selectedCompanyId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCompany(c.id)}
                      style={{
                        padding: '1rem',
                        border: '1px solid',
                        borderColor: active ? 'var(--brand-500)' : 'var(--neutral-200)',
                        backgroundColor: active ? 'var(--brand-50)' : 'white',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      className="company-item"
                    >
                      <div>
                        <h4 style={{ fontSize: '0.9rem', color: active ? 'var(--brand-700)' : 'var(--neutral-800)', fontWeight: 600 }}>
                          {c.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 500 }}>
                          🏁 HQ: {c.headquartersCountry} | {c.industry}
                        </span>
                      </div>
                      <Badge status={c.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detail Pane OR Add Form */}
        <div>
          {showCreateForm ? (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>➕ Register New Client Entity</h3>
                <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
              </div>

              {creationError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  ⚠️ {creationError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {isPlatformRole && (
                  <div className="form-group">
                    <label className="form-label">Target Tenant ID (from directory)</label>
                    <input type="text" placeholder="e.g. uuid of Stark Industries" className="form-input" {...register('tenantId')} />
                  </div>
                )}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Brand Name</label>
                    <input type="text" placeholder="e.g. ACME Tech" className="form-input" {...register('name')} />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Legal Name</label>
                    <input type="text" placeholder="e.g. ACME Tech Solutions Inc." className="form-input" {...register('legalName')} />
                    {errors.legalName && <span className="form-error">{errors.legalName.message}</span>}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Industry</label>
                    <input type="text" placeholder="e.g. Software Services" className="form-input" {...register('industry')} />
                    {errors.industry && <span className="form-error">{errors.industry.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">HQ Country (2-Letter Code)</label>
                    <input type="text" placeholder="e.g. US" maxLength={2} className="form-input" {...register('headquartersCountry')} />
                    {errors.headquartersCountry && <span className="form-error">{errors.headquartersCountry.message}</span>}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Primary Contact Name</label>
                    <input type="text" placeholder="Thomas Acme" className="form-input" {...register('primaryContactName')} />
                    {errors.primaryContactName && <span className="form-error">{errors.primaryContactName.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Contact Email</label>
                    <input type="email" placeholder="thomas@acme.com" className="form-input" {...register('primaryContactEmail')} />
                    {errors.primaryContactEmail && <span className="form-error">{errors.primaryContactEmail.message}</span>}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ marginTop: '0.5rem', width: 'fit-content' }}>
                  {isSubmitting ? 'Creating Company...' : '➕ Register Entity'}
                </button>
              </form>
            </div>
          ) : selectedCompany ? (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedCompany.name}</h2>
                    <Badge status={selectedCompany.status} />
                  </div>
                  <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 500 }}>
                    Legal Name: <b>{selectedCompany.legalName}</b>
                  </p>
                </div>
              </div>

              {/* Quick details */}
              <div className="grid-3" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>HQ Location</span>
                  <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>🏁 {selectedCompany.headquartersCountry}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Industry</span>
                  <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>💼 {selectedCompany.industry}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Primary Contact</span>
                  <span style={{ fontWeight: 600, color: 'var(--neutral-800)', fontSize: '0.85rem' }}>
                    👤 {selectedCompany.primaryContactName}
                    <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 500 }}>{selectedCompany.primaryContactEmail}</div>
                  </span>
                </div>
              </div>

              {/* Workers list */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>👷</span> Associated Employees ({selectedCompany.workers?.length || 0})
                </h3>

                {isDetailLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Loading workforce list...</div>
                ) : (
                  <Table
                    columns={[
                      {
                        header: 'Name',
                        render: (row) => (
                          <div style={{ fontWeight: 600 }}>{row.firstName} {row.lastName}</div>
                        ),
                      },
                      {
                        header: 'Job Title',
                        render: (row) => (
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.jobTitle}</span>
                        ),
                      },
                      {
                        header: 'Status',
                        render: (row) => <Badge status={row.employmentStatus} />,
                      },
                    ]}
                    data={selectedCompany.workers || []}
                    emptyMessage="No workers currently assigned to this company."
                    pageSize={4}
                  />
                )}
              </div>
            </div>
          ) : (
            <div
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6rem 2rem',
                backgroundColor: 'white',
                color: 'var(--neutral-400)',
                border: '1px dashed var(--neutral-300)',
                textAlign: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '3rem' }}>🏢</span>
              <h3 style={{ color: 'var(--neutral-700)', fontWeight: 600 }}>No Client Selected</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
                Select a corporate client from the directory checklist to explore their detailed operations.
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .company-item:hover {
          background-color: var(--neutral-50) !important;
          border-color: var(--brand-500) !important;
        }
      `}</style>
    </div>
  );
};
