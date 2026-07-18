import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  WorkerCreateSchema,
  WorkerCreateInput,
  ContractCreateSchema,
  ContractCreateInput,
  DocumentUploadSchema,
  DocumentUploadInput,
  EmploymentStatus,
  ContractType,
  ContractStatus,
  DocumentType,
  BenefitStatus,
  UserRole,
} from '@gwos/shared';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import { useAuth } from '../context/AuthContext';

export const Workers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'contract' | 'onboarding' | 'documents' | 'payroll' | 'benefits'>('profile');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Status override modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<EmploymentStatus | null>(null);
  const [statusOverrideReason, setStatusOverrideReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Document Reject Modal
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 1. Fetch Workers
  const { data: workers = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await api.get('/workers');
      return response.data;
    },
  });

  // 2. Fetch Selected Worker Profile Detail
  const { data: selectedWorker, isLoading: isDetailLoading, error: detailError } = useQuery<any>({
    queryKey: ['workerDetail', id],
    queryFn: async () => {
      const response = await api.get(`/workers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // 3. Fetch Companies List for Form Options
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies');
      return response.data;
    },
    enabled: showCreateForm,
  });

  // 4. Fetch Countries List for Form Options
  const { data: countries = [] } = useQuery<any[]>({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await api.get('/countries');
      return response.data;
    },
    enabled: !!id,
  });

  // Create Worker Mutation
  const createWorkerMutation = useMutation({
    mutationFn: async (input: WorkerCreateInput & { tenantId?: string }) => {
      return api.post('/workers', input);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setShowCreateForm(false);
      resetWorkerForm();
      navigate(`/workers/${res.data.id}`);
    },
    onError: (err: any) => {
      setCreationError(err.response?.data?.message || 'Failed to create worker profile');
    },
  });

  // Create Contract Mutation
  const createContractMutation = useMutation({
    mutationFn: async (input: ContractCreateInput) => {
      return api.post('/contracts', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
      resetContractForm();
    },
  });

  // Upload Document Mutation
  const uploadDocMutation = useMutation({
    mutationFn: async (input: DocumentUploadInput & { workerId: string }) => {
      return api.post('/documents', input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
      resetDocForm();
    },
  });

  // Update Worker Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (input: { status: EmploymentStatus; overrideReason?: string }) => {
      return api.patch(`/workers/${id}/status`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setShowStatusModal(false);
      setStatusOverrideReason('');
      setTargetStatus(null);
      setStatusError(null);
    },
    onError: (err: any) => {
      setStatusError(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Update Onboarding Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return api.patch(`/onboarding/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
    },
  });

  // Approve Document Mutation
  const approveDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return api.patch(`/documents/${docId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
    },
  });

  // Reject Document Mutation
  const rejectDocMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      return api.patch(`/documents/${docId}/reject`, { rejectionReason: reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workerDetail', id] });
      setShowRejectModal(null);
      setRejectReason('');
    },
  });

  // Forms setup
  const {
    register: registerWorker,
    handleSubmit: handleSubmitWorker,
    reset: resetWorkerForm,
    formState: { errors: workerErrors },
  } = useForm<WorkerCreateInput & { tenantId?: string }>({
    resolver: zodResolver(WorkerCreateSchema),
  });

  const {
    register: registerContract,
    handleSubmit: handleSubmitContract,
    reset: resetContractForm,
    formState: { errors: contractErrors },
  } = useForm<ContractCreateInput>({
    resolver: zodResolver(ContractCreateSchema),
  });

  const {
    register: registerDoc,
    handleSubmit: handleSubmitDoc,
    reset: resetDocForm,
    formState: { errors: docErrors },
  } = useForm<DocumentUploadInput>({
    resolver: zodResolver(DocumentUploadSchema),
  });

  // Filters application
  const filteredWorkers = workers.filter((w) => {
    const fullName = `${w.firstName} ${w.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || w.email.toLowerCase().includes(searchQuery.toLowerCase()) || w.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === '' || w.department.toLowerCase() === deptFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const handleCreateWorker = (data: WorkerCreateInput & { tenantId?: string }) => {
    setCreationError(null);
    createWorkerMutation.mutate(data);
  };

  const handleCreateContract = (data: ContractCreateInput) => {
    createContractMutation.mutate(data);
  };

  const handleUploadDoc = (data: DocumentUploadInput) => {
    if (id) {
      uploadDocMutation.mutate({ ...data, workerId: id });
    }
  };

  const triggerStatusTransition = (status: EmploymentStatus) => {
    setTargetStatus(status);
    setStatusError(null);
    setShowStatusModal(true);
  };

  const handleConfirmStatus = () => {
    if (targetStatus) {
      updateStatusMutation.mutate({
        status: targetStatus,
        overrideReason: statusOverrideReason || undefined,
      });
    }
  };

  const handleApproveDoc = (docId: string) => {
    approveDocMutation.mutate(docId);
  };

  const handleRejectDoc = (docId: string) => {
    if (rejectReason.trim().length < 3) {
      alert('Please provide a descriptive rejection reason (minimum 3 characters)');
      return;
    }
    rejectDocMutation.mutate({ docId, reason: rejectReason });
  };

  const canEditOrManage = user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS || user?.role === UserRole.CLIENT_ADMIN;

  return (
    <div>
      {/* 1. Worker Profiles list view (render only if NO id in route params) */}
      {!id ? (
        <div>
          <div className="page-header">
            <div>
              <h1 style={{ fontSize: '1.8rem' }}>Managed Workforce Directory</h1>
              <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
                Onboard, coordinate, and review local employment contracts globally.
              </p>
            </div>
            {canEditOrManage && (
              <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
                {showCreateForm ? 'View Directory' : '➕ Add Managed Worker'}
              </button>
            )}
          </div>

          {showCreateForm ? (
            <div className="card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>➕ Initiate New Global Employee Onboarding</h3>
              
              {creationError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  ⚠️ {creationError}
                </div>
              )}

              <form onSubmit={handleSubmitWorker(handleCreateWorker)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {user?.role === UserRole.PLATFORM_ADMIN && (
                  <div className="form-group">
                    <label className="form-label">Platform Admin: Target Tenant ID</label>
                    <input type="text" placeholder="UUID of ACME or Stark" className="form-input" {...registerWorker('tenantId')} />
                  </div>
                )}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Client Company</label>
                    <select className="form-select" {...registerWorker('companyId')}>
                      <option value="">Select Employer entity...</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {workerErrors.companyId && <span className="form-error">{workerErrors.companyId.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Workforce Country Code (2-letter ISO)</label>
                    <input type="text" placeholder="e.g. US, GB, DE" maxLength={2} className="form-input" {...registerWorker('countryCode')} />
                    {workerErrors.countryCode && <span className="form-error">{workerErrors.countryCode.message}</span>}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input type="text" placeholder="John" className="form-input" {...registerWorker('firstName')} />
                    {workerErrors.firstName && <span className="form-error">{workerErrors.firstName.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input type="text" placeholder="Doe" className="form-input" {...registerWorker('lastName')} />
                    {workerErrors.lastName && <span className="form-error">{workerErrors.lastName.message}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Email Address (will create login credentials)</label>
                  <input type="email" placeholder="john.doe@acmetech.com" className="form-input" {...registerWorker('email')} />
                  {workerErrors.email && <span className="form-error">{workerErrors.email.message}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Job Title</label>
                    <input type="text" placeholder="Staff Infrastructure Engineer" className="form-input" {...registerWorker('jobTitle')} />
                    {workerErrors.jobTitle && <span className="form-error">{workerErrors.jobTitle.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input type="text" placeholder="Engineering" className="form-input" {...registerWorker('department')} />
                    {workerErrors.department && <span className="form-error">{workerErrors.department.message}</span>}
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Target Employment Start Date</label>
                    <input type="date" className="form-input" {...registerWorker('startDate')} />
                    {workerErrors.startDate && <span className="form-error">{workerErrors.startDate.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reporting Manager Name (optional)</label>
                    <input type="text" placeholder="Thomas Acme" className="form-input" {...registerWorker('managerName')} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reporting Manager Email (optional)</label>
                  <input type="email" placeholder="thomas@acme.com" className="form-input" {...registerWorker('managerEmail')} />
                  {workerErrors.managerEmail && <span className="form-error">{workerErrors.managerEmail.message}</span>}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                  🚀 Initiate Onboarding Plan
                </button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Filtering Controls */}
              <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by name, email, or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ flex: 2 }}
                />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="form-select"
                  style={{ flex: 1 }}
                >
                  <option value="">📂 All Departments</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product Development">Product</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <Table
                columns={[
                  {
                    header: 'Full Name',
                    render: (row) => (
                      <div
                        onClick={() => navigate(`/workers/${row.id}`)}
                        style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--brand-600)' }}
                        className="hover-underline"
                      >
                        👤 {row.firstName} {row.lastName}
                      </div>
                    ),
                  },
                  {
                    header: 'Corporate Email',
                    render: (row) => <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>{row.email}</span>,
                  },
                  {
                    header: 'Employer / Country',
                    render: (row) => (
                      <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 500 }}>{row.company.name}</div>
                        <div style={{ color: 'var(--neutral-400)' }}>🏁 Country: {row.countryCode}</div>
                      </div>
                    ),
                  },
                  {
                    header: 'Role Details',
                    render: (row) => (
                      <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 500 }}>{row.jobTitle}</div>
                        <div style={{ color: 'var(--neutral-400)' }}>🏢 {row.department}</div>
                      </div>
                    ),
                  },
                  {
                    header: 'Onboarding Status',
                    render: (row) => <Badge status={row.employmentStatus} />,
                  },
                ]}
                data={filteredWorkers}
                emptyMessage="No employees matched your current search parameters."
                pageSize={6}
              />
            </div>
          )}
        </div>
      ) : (
        /* 2. Worker Detail Multi-Tab Workspace */
        <div>
          {isDetailLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
              <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : detailError || !selectedWorker ? (
            <div style={{ padding: '2rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)' }}>
              <h4>Worker Detail Error</h4>
              <p>Failed to find record matching ID {id}. You may have crossed tenant boundaries.</p>
              <button onClick={() => navigate('/workers')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to Workforce</button>
            </div>
          ) : (
            <div>
              {/* Detailed Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  padding: '2rem',
                  borderBottom: 'none',
                }}
              >
                <div>
                  <button onClick={() => navigate('/workers')} style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}>
                    ← Back to workforce directory
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                      {selectedWorker.firstName} {selectedWorker.lastName}
                    </h1>
                    <Badge status={selectedWorker.employmentStatus} />
                  </div>
                  <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
                    {selectedWorker.jobTitle} | 🏢 {selectedWorker.department} | Employer: <b>{selectedWorker.company.name}</b>
                  </p>
                </div>

                {/* Status Transitions buttons for admins */}
                {canEditOrManage && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedWorker.employmentStatus === 'ONBOARDING' && (
                      <button onClick={() => triggerStatusTransition(EmploymentStatus.ACTIVE)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        🟢 Activate Employee
                      </button>
                    )}
                    {selectedWorker.employmentStatus === 'ACTIVE' && (
                      <button onClick={() => triggerStatusTransition(EmploymentStatus.PAUSED)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        ⏸️ Pause Employee
                      </button>
                    )}
                    {['ACTIVE', 'PAUSED'].includes(selectedWorker.employmentStatus) && (
                      <button onClick={() => triggerStatusTransition(EmploymentStatus.TERMINATED)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        🛑 Terminate Contract
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tabs Nav */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderBottom: '1px solid var(--neutral-200)',
                  padding: '0 2rem',
                }}
              >
                {(['profile', 'contract', 'onboarding', 'documents', 'payroll', 'benefits'] as const).map((tab) => {
                  const active = tab === activeTab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '1rem 1.5rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        borderBottom: active ? '3px solid var(--brand-500)' : '3px solid transparent',
                        color: active ? 'var(--brand-600)' : 'var(--neutral-500)',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Panel */}
              <div
                style={{
                  backgroundColor: 'white',
                  border: '1px solid var(--neutral-200)',
                  borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                  padding: '2.5rem',
                  borderTop: 'none',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {/* 2.1 Tab PROFILE */}
                {activeTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="grid-2">
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Employee Information</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Full Name:</span> <b>{selectedWorker.firstName} {selectedWorker.lastName}</b></div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Email Address:</span> <b>{selectedWorker.email}</b></div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Employment Type:</span> 🏁 Local Employment (Country: <b>{selectedWorker.countryCode}</b>)</div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Target Start Date:</span> <b>{new Date(selectedWorker.startDate).toLocaleDateString()}</b></div>
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Management & Hierarchy</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Department:</span> <b>{selectedWorker.department}</b></div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Job Title:</span> <b>{selectedWorker.jobTitle}</b></div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Manager Name:</span> <b>{selectedWorker.managerName || 'None assigned'}</b></div>
                          <div><span style={{ color: 'var(--neutral-400)' }}>Manager Email:</span> <b>{selectedWorker.managerEmail || 'None assigned'}</b></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.2 Tab CONTRACT */}
                {activeTab === 'contract' && (
                  <div>
                    {selectedWorker.contracts && selectedWorker.contracts.length > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Employment Contract Agreement</h3>
                          <Badge status={selectedWorker.contracts[0].status} />
                        </div>
                        
                        <div className="grid-3" style={{ marginBottom: '2rem', backgroundColor: 'var(--neutral-50)', padding: '1.5rem', borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600 }}>AGREED COMPENSATION</span>
                            <h3 style={{ color: 'var(--neutral-800)', fontSize: '1.35rem' }}>
                              {selectedWorker.contracts[0].compensationCurrency} {selectedWorker.contracts[0].compensationAmount.toLocaleString()}
                            </h3>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600 }}>CONTRACT STRUCTURE</span>
                            <h4 style={{ color: 'var(--neutral-800)', textTransform: 'capitalize' }}>
                              💼 {selectedWorker.contracts[0].contractType.replace(/_/g, ' ').toLowerCase()}
                            </h4>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600 }}>EFFECTIVE DATE</span>
                            <h4 style={{ color: 'var(--neutral-800)' }}>
                              📅 {new Date(selectedWorker.contracts[0].effectiveDate).toLocaleDateString()}
                            </h4>
                          </div>
                        </div>

                        {/* Transitions controls for contract signature */}
                        {selectedWorker.contracts[0].status === 'SENT' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid var(--pending-border)', backgroundColor: 'var(--pending-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ color: 'var(--pending-text)', fontSize: '0.85rem', fontWeight: 600 }}>
                              🖊️ Contract is drafted and delivered. The worker is required to sign the contract to initialize local employment.
                            </p>
                            {(user?.role === UserRole.WORKER || canEditOrManage) && (
                              <button
                                onClick={() => api.patch(`/contracts/${selectedWorker.contracts[0].id}/status`, { status: 'SIGNED' }).then(() => queryClient.invalidateQueries({ queryKey: ['workerDetail', id] }))}
                                className="btn btn-primary"
                                style={{ width: 'fit-content', marginTop: '0.25rem' }}
                              >
                                Sign Agreement
                              </button>
                            )}
                          </div>
                        )}

                        {selectedWorker.contracts[0].status === 'SIGNED' && canEditOrManage && (
                          <div style={{ border: '1px solid var(--info-border)', backgroundColor: 'var(--info-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ color: 'var(--info-text)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              ✅ Contract is executed and signed. Operations staff must transition it to ACTIVE.
                            </p>
                            <button
                              onClick={() => api.patch(`/contracts/${selectedWorker.contracts[0].id}/status`, { status: 'ACTIVE' }).then(() => queryClient.invalidateQueries({ queryKey: ['workerDetail', id] }))}
                              className="btn btn-primary"
                              style={{ width: 'fit-content' }}
                            >
                              Activate Contract
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {canEditOrManage ? (
                          <div style={{ maxWidth: '600px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>✏️ Draft New Employment Contract Agreement</h3>
                            
                            <form onSubmit={handleSubmitContract(handleCreateContract)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <input type="hidden" value={selectedWorker.id} {...registerContract('workerId')} />
                              
                              <div className="form-group">
                                <label className="form-label">Target Compliance Country</label>
                                <select className="form-select" {...registerContract('countryId')}>
                                  <option value="">Select country terms...</option>
                                  {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.currencyCode})</option>)}
                                </select>
                                {contractErrors.countryId && <span className="form-error">{contractErrors.countryId.message}</span>}
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label className="form-label">Contract Type</label>
                                  <select className="form-select" {...registerContract('contractType')}>
                                    <option value="FULL_TIME">Full Time</option>
                                    <option value="PART_TIME">Part Time</option>
                                    <option value="FIXED_TERM">Fixed Term</option>
                                    <option value="CONTRACTOR">Contractor</option>
                                  </select>
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Compensation Currency (e.g. USD, GBP)</label>
                                  <input type="text" placeholder="USD" maxLength={3} className="form-input" {...registerContract('compensationCurrency')} />
                                  {contractErrors.compensationCurrency && <span className="form-error">{contractErrors.compensationCurrency.message}</span>}
                                </div>
                              </div>

                              <div className="grid-2">
                                <div className="form-group">
                                  <label className="form-label">Compensation Amount (Gross/Month)</label>
                                  <input type="number" step="0.01" placeholder="10000" className="form-input" {...registerContract('compensationAmount', { valueAsNumber: true })} />
                                  {contractErrors.compensationAmount && <span className="form-error">{contractErrors.compensationAmount.message}</span>}
                                </div>
                                <div className="form-group">
                                  <label className="form-label">Agreement Effective Date</label>
                                  <input type="date" className="form-input" {...registerContract('effectiveDate')} />
                                  {contractErrors.effectiveDate && <span className="form-error">{contractErrors.effectiveDate.message}</span>}
                                </div>
                              </div>

                              <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                                ✍️ Draft & Store Agreement
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-400)' }}>
                            No contract drafted for this worker. Please contact corporate client administrators.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2.3 Tab ONBOARDING */}
                {activeTab === 'onboarding' && (
                  <div>
                    {selectedWorker.onboardingPlan ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                          <div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Compliance Onboarding Checklist</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', fontWeight: 500 }}>
                              Plan target due date: <b>{new Date(selectedWorker.onboardingPlan.dueDate).toLocaleDateString()}</b>
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--brand-600)' }}>
                              {selectedWorker.onboardingPlan.status === 'COMPLETED' ? '100' : '50'}%
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Onboarding Progress</div>
                          </div>
                        </div>

                        {/* Onboarding plan tasks */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {selectedWorker.onboardingPlan.tasks?.map((task: any) => (
                            <div
                              key={task.id}
                              style={{
                                padding: '1.25rem',
                                border: '1px solid var(--neutral-200)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'var(--transition-smooth)',
                              }}
                            >
                              <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--neutral-800)' }}>{task.title}</h4>
                                <p style={{ color: 'var(--neutral-500)', fontSize: '0.8rem', marginTop: '0.125rem' }}>{task.description}</p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--neutral-400)' }}>
                                  <span>👤 Assigned: {task.assignedToRole}</span>
                                  <span>📅 Limit: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Badge status={task.status} />
                                {task.status !== 'DONE' && (task.assignedToRole === user?.role || canEditOrManage) && (
                                  <button
                                    onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'DONE' })}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                  >
                                    Mark Done
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--neutral-400)' }}>
                        No onboarding plan created. Initialize employee record first.
                      </div>
                    )}
                  </div>
                )}

                {/* 2.4 Tab DOCUMENTS */}
                {activeTab === 'documents' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
                      {/* Document upload form (only allowed for worker or admins) */}
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>📁 Submit Compliance Document</h3>
                        
                        <form onSubmit={handleSubmitDoc(handleUploadDoc)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div className="form-group">
                            <label className="form-label">Document Classification Type</label>
                            <select className="form-select" {...registerDoc('documentType')}>
                              <option value="PASSPORT">Passport (Identity Verification)</option>
                              <option value="TAX_FORM">Tax Withholding Declaration</option>
                              <option value="BANK_INFO">Direct Deposit details</option>
                              <option value="CONTRACT">Local Agreement Contract</option>
                              <option value="OTHER">Other supportive proofs</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Physical File Name</label>
                            <input type="text" placeholder="passport_copy.pdf" className="form-input" {...registerDoc('fileName')} />
                            {errors.name && <span className="form-error">{docErrors.fileName?.message}</span>}
                          </div>

                          <div className="form-group">
                            <label className="form-label">Simulated Cloud URL Path</label>
                            <input type="text" placeholder="/uploads/acme-corp/worker-1/passport.pdf" className="form-input" {...registerDoc('fileUrl')} />
                            {errors.name && <span className="form-error">{docErrors.fileUrl?.message}</span>}
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                            📁 Submit Metadata
                          </button>
                        </form>
                      </div>

                      {/* Documents Directory */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>📂 Submitted Document history ({selectedWorker.documents?.length || 0})</h3>
                        
                        {selectedWorker.documents?.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
                            No documents submitted yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {selectedWorker.documents?.map((doc: any) => (
                              <div
                                key={doc.id}
                                style={{
                                  padding: '1rem',
                                  border: '1px solid var(--neutral-200)',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--neutral-50)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{doc.fileName}</h4>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 500 }}>
                                      Type: <b>{doc.documentType}</b> | Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <Badge status={doc.status} />
                                </div>

                                {doc.rejectionReason && (
                                  <div style={{ padding: '0.5rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                    ❌ Rejection reason: <i>{doc.rejectionReason}</i>
                                  </div>
                                )}

                                {/* Admin review panel */}
                                {doc.status === 'PENDING_REVIEW' && (user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS) && (
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    <button onClick={() => handleApproveDoc(doc.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--success-text)', borderColor: 'var(--success-border)', backgroundColor: 'var(--success-bg)' }}>
                                      Approve
                                    </button>
                                    <button onClick={() => setShowRejectModal(doc.id)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
                                      Reject
                                    </button>
                                  </div>
                                )}

                                {/* Inline rejection inputs */}
                                {showRejectModal === doc.id && (
                                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                      type="text"
                                      placeholder="Provide reject reason (e.g. illegible photocopy)..."
                                      value={rejectReason}
                                      onChange={(e) => setRejectReason(e.target.value)}
                                      className="form-input"
                                      style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button onClick={() => handleRejectDoc(doc.id)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'var(--danger-text)' }}>
                                        Confirm Rejection
                                      </button>
                                      <button onClick={() => setShowRejectModal(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2.5 Tab PAYROLL */}
                {activeTab === 'payroll' && (
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>💰 Disbursed Payroll paystubs history</h3>
                    
                    <Table
                      columns={[
                        {
                          header: 'Disbursed Pay Date',
                          render: (row) => (
                            <span style={{ fontWeight: 600 }}>
                              📅 {new Date(row.payrollCycle.payDate).toLocaleDateString()}
                            </span>
                          ),
                        },
                        {
                          header: 'Reference Pay Period',
                          render: (row) => (
                            <span style={{ fontSize: '0.85rem', color: 'var(--neutral-500)' }}>
                              {new Date(row.payrollCycle.periodStart).toLocaleDateString()} - {new Date(row.payrollCycle.periodEnd).toLocaleDateString()}
                            </span>
                          ),
                        },
                        {
                          header: 'Agreed Gross Pay',
                          render: (row) => (
                            <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>
                              {row.currency} {row.grossAmount.toLocaleString()}
                            </span>
                          ),
                        },
                        {
                          header: 'Payout Status',
                          render: (row) => <Badge status={row.status} />,
                        },
                      ]}
                      data={selectedWorker.payrollItems || []}
                      emptyMessage="No paycheck records registered for this workforce slot."
                      pageSize={4}
                    />
                  </div>
                )}

                {/* 2.6 Tab BENEFITS */}
                {activeTab === 'benefits' && (
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>🛡️ Enrolled Health & Welfare benefits</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {selectedWorker.benefitEnrollments?.map((b: any) => (
                        <div
                          key={b.id}
                          style={{
                            padding: '1.25rem',
                            border: '1px solid var(--neutral-200)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'capitalize' }}>🛡️ {b.benefitType.toLowerCase()} Insurance</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.125rem' }}>
                              Carrier provider: <b>{b.providerName}</b>
                            </p>
                            {b.effectiveDate && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>
                                Active since: {new Date(b.effectiveDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Badge status={b.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Status Override Transition Modal */}
      {showStatusModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div className="card" style={{ padding: '2rem', width: '90%', maxWidth: '440px', backgroundColor: 'white' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem' }}>Confirm Status Transition</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-500)', marginBottom: '1rem' }}>
              Are you sure you want to transition employee status to <b>{targetStatus}</b>?
            </p>

            {/* If transitioning to ACTIVE and onboarding isn't completed, prompt for override reason */}
            {targetStatus === 'ACTIVE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', color: '#b45309', fontSize: '0.75rem', fontWeight: 500 }}>
                  ⚠️ Worker compliance onboarding plan is incomplete. To activate this worker, you must provide a corporate override reason.
                </div>
                <label className="form-label">Administrative Override Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Local agency confirmation received"
                  value={statusOverrideReason}
                  onChange={(e) => setStatusOverrideReason(e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            {statusError && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', marginBottom: '1rem' }}>
                ❌ {statusError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStatusModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleConfirmStatus} className="btn btn-primary">Confirm transition</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
