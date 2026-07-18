import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import { useAuth } from '../context/AuthContext';

interface PayrollCycle {
  id: string;
  tenantId: string;
  companyId: string;
  countryId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  status: string;
  company: { name: string };
  country: { name: string; currencyCode: string };
  currencySummaries?: {
    currency: string;
    grossAmount: number;
    count: number;
  }[];
  payrollItems?: {
    id: string;
    grossAmount: number;
    currency: string;
    status: string;
    notes: string | null;
    worker: { id: string; firstName: string; lastName: string; jobTitle: string };
  }[];
}

export const Payroll: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Form states for custom payroll items
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemWorkerId, setAddItemWorkerId] = useState('');
  const [addItemAmount, setAddItemAmount] = useState('');
  const [addItemCurrency, setAddItemCurrency] = useState('');
  const [addItemNotes, setAddItemNotes] = useState('');

  // 1. Fetch Payroll Cycles
  const { data: cycles = [], isLoading } = useQuery<PayrollCycle[]>({
    queryKey: ['payrollCycles'],
    queryFn: async () => {
      const response = await api.get('/payroll-cycles');
      return response.data;
    },
  });

  // 2. Fetch Selected Cycle details (includes items & summaries)
  const { data: selectedCycle, isLoading: isDetailLoading } = useQuery<PayrollCycle>({
    queryKey: ['payrollCycleDetail', selectedCycleId],
    queryFn: async () => {
      const response = await api.get(`/payroll-cycles/${selectedCycleId}`);
      return response.data;
    },
    enabled: !!selectedCycleId,
  });

  // 3. Fetch active workers to populate "Add Item" list
  const { data: workers = [] } = useQuery<any[]>({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await api.get('/workers');
      return response.data;
    },
    enabled: showAddItem,
  });

  // Create Cycle Mutation
  const createCycleMutation = useMutation({
    mutationFn: async (input: any) => {
      return api.post('/payroll-cycles', input);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['payrollCycles'] });
      setShowCreateForm(false);
      setSelectedCycleId(res.data.id);
    },
    onError: (err: any) => {
      setCreationError(err.response?.data?.message || 'Failed to create payroll cycle');
    },
  });

  // Update Cycle Status Mutation
  const updateCycleStatusMutation = useMutation({
    mutationFn: async ({ cycleId, status }: { cycleId: string; status: string }) => {
      return api.patch(`/payroll-cycles/${cycleId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollCycles'] });
      queryClient.invalidateQueries({ queryKey: ['payrollCycleDetail', selectedCycleId] });
    },
  });

  // Add Custom Item Mutation
  const addItemMutation = useMutation({
    mutationFn: async (input: any) => {
      return api.post(`/payroll-cycles/${selectedCycleId}/items`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollCycleDetail', selectedCycleId] });
      setShowAddItem(false);
      setAddItemWorkerId('');
      setAddItemAmount('');
      setAddItemCurrency('');
      setAddItemNotes('');
    },
  });

  // Update Individual Item Status Mutation
  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      return api.patch(`/payroll-items/${itemId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollCycleDetail', selectedCycleId] });
    },
  });

  // Form submits
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [cycleCompanyId, setCycleCompanyId] = useState('');
  const [cycleCountryId, setCycleCountryId] = useState('');
  const [cycleStart, setCycleStart] = useState('');
  const [cycleEnd, setCycleEnd] = useState('');
  const [cyclePayDate, setCyclePayDate] = useState('');

  const triggerCreateFormOpen = async () => {
    setShowCreateForm(true);
    setSelectedCycleId(null);
    setCreationError(null);
    try {
      const compRes = await api.get('/companies');
      const countRes = await api.get('/countries');
      setCompaniesList(compRes.data);
      setCountriesList(countRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);
    createCycleMutation.mutate({
      companyId: cycleCompanyId,
      countryId: cycleCountryId,
      periodStart: cycleStart,
      periodEnd: cycleEnd,
      payDate: cyclePayDate,
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItemMutation.mutate({
      workerId: addItemWorkerId,
      grossAmount: Number(addItemAmount),
      currency: addItemCurrency,
      notes: addItemNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const canManagePayroll = user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS || user?.role === UserRole.CLIENT_ADMIN;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>EOR Payroll Operations</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Automate paycheck generation, review currency exposures, and manage payout funding.
          </p>
        </div>
        {canManagePayroll && !showCreateForm && (
          <button onClick={triggerCreateFormOpen} className="btn btn-primary">
            ➕ Initialize Payroll Period
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        {/* Left column: Cycles Directory */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>💰</span> Pay periods ({cycles.length})
            </h3>

            {cycles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
                No active payroll cycles recorded.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cycles.map((c) => {
                  const active = c.id === selectedCycleId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCycleId(c.id); setShowCreateForm(false); }}
                      style={{
                        padding: '1rem',
                        border: '1px solid',
                        borderColor: active ? 'var(--brand-500)' : 'var(--neutral-200)',
                        backgroundColor: active ? 'var(--brand-50)' : 'white',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                      }}
                      className="cycle-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: active ? 'var(--brand-700)' : 'var(--neutral-800)' }}>
                          📅 {new Date(c.periodStart).toLocaleDateString()} - {new Date(c.periodEnd).toLocaleDateString()}
                        </h4>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', marginTop: '0.5rem', fontWeight: 500 }}>
                        Company: <b>{c.company.name}</b> | Payout: {new Date(c.payDate).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Details workspace OR creation form */}
        <div>
          {showCreateForm ? (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>➕ Initialize Payroll Cycle</h3>
                <button onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>
                  Cancel
                </button>
              </div>

              {creationError && (
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  ⚠️ {creationError}
                </div>
              )}

              <form onSubmit={handleCreateCycle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Client Employer</label>
                    <select value={cycleCompanyId} onChange={(e) => setCycleCompanyId(e.target.value)} required className="form-select">
                      <option value="">Select Company...</option>
                      {companiesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compliance Country</label>
                    <select value={cycleCountryId} onChange={(e) => setCycleCountryId(e.target.value)} required className="form-select">
                      <option value="">Select Country terms...</option>
                      {countriesList.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.currencyCode})</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Period Start Date</label>
                    <input type="date" value={cycleStart} onChange={(e) => setCycleStart(e.target.value)} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Period End Date</label>
                    <input type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payout Funding Date</label>
                    <input type="date" value={cyclePayDate} onChange={(e) => setCyclePayDate(e.target.value)} required className="form-input" />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                  ⚙️ Initialize & Auto-Generate Items
                </button>
              </form>
            </div>
          ) : selectedCycle ? (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Header details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--neutral-200)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                      Cycle Ledger Detail
                    </h2>
                    <Badge status={selectedCycle.status} />
                  </div>
                  <p style={{ color: 'var(--neutral-500)', fontSize: '0.85rem', marginTop: '0.25rem', fontWeight: 500 }}>
                    Employer: <b>{selectedCycle.company.name}</b> | Compliance Country: <b>{selectedCycle.country.name}</b>
                  </p>
                </div>

                {/* Closing states transition buttons */}
                {canManagePayroll && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedCycle.status === 'DRAFT' && (
                      <button onClick={() => updateCycleStatusMutation.mutate({ cycleId: selectedCycle.id, status: 'COLLECTING_INPUTS' })} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        Start Collecting Inputs
                      </button>
                    )}
                    {selectedCycle.status === 'COLLECTING_INPUTS' && (
                      <button onClick={() => updateCycleStatusMutation.mutate({ cycleId: selectedCycle.id, status: 'REVIEW' })} className="btn className btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--warning-text)' }}>
                        Lock for Review
                      </button>
                    )}
                    {selectedCycle.status === 'REVIEW' && (
                      <button onClick={() => updateCycleStatusMutation.mutate({ cycleId: selectedCycle.id, status: 'APPROVED' })} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--success-text)' }}>
                        Approve Cycle funding
                      </button>
                    )}
                    {selectedCycle.status === 'APPROVED' && (
                      <button onClick={() => updateCycleStatusMutation.mutate({ cycleId: selectedCycle.id, status: 'PAID' })} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        💳 Disburse Payments
                      </button>
                    )}
                    {selectedCycle.status === 'PAID' && (
                      <button onClick={() => updateCycleStatusMutation.mutate({ cycleId: selectedCycle.id, status: 'CLOSED' })} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                        🔒 Close cycle period
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Currency summaries aggregation box */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  💵 Cycle Financial Exposure Summary
                </h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {selectedCycle.currencySummaries?.map((sum) => (
                    <div key={sum.currency} style={{ backgroundColor: 'var(--neutral-50)', padding: '1rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-200)', minWidth: '160px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', fontWeight: 600 }}>CASH FLOW ({sum.count} items)</span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--neutral-800)', marginTop: '0.125rem' }}>
                        {sum.currency} {sum.grossAmount.toLocaleString()}
                      </h3>
                    </div>
                  ))}
                </div>
              </div>

              {/* PayrollItems listing */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>👷 Individual Pay slips ({selectedCycle.payrollItems?.length || 0})</h3>
                  {canManagePayroll && !['PAID', 'CLOSED'].includes(selectedCycle.status) && !showAddItem && (
                    <button onClick={() => setShowAddItem(true)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                      ➕ Add Custom Payout
                    </button>
                  )}
                </div>

                {/* Add Custom Item form inline */}
                {showAddItem && (
                  <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem', border: '1px solid var(--pending-border)', backgroundColor: 'var(--pending-bg)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pending-text)' }}>➕ Append Custom Payout / Bonus Line</h4>
                    
                    <div className="grid-3">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select value={addItemWorkerId} onChange={(e) => setAddItemWorkerId(e.target.value)} required className="form-select" style={{ padding: '0.4rem', fontSize: '0.8rem' }}>
                          <option value="">Select Employee...</option>
                          {workers.map((w: any) => <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="number" step="0.01" placeholder="Amount (e.g. 500)" value={addItemAmount} onChange={(e) => setAddItemAmount(e.target.value)} required className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" placeholder="Currency (USD)" value={addItemCurrency} onChange={(e) => setAddItemCurrency(e.target.value)} required className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <input type="text" placeholder="Description / Notes (e.g. Q1 Performance Bonus)..." value={addItemNotes} onChange={(e) => setAddItemNotes(e.target.value)} className="form-input" style={{ padding: '0.4rem', fontSize: '0.8rem' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Add Line</button>
                      <button type="button" onClick={() => setShowAddItem(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>Cancel</button>
                    </div>
                  </form>
                )}

                <Table
                  columns={[
                    {
                      header: 'Employee Name',
                      render: (row) => (
                        <div style={{ fontWeight: 600 }}>
                          {row.worker.firstName} {row.worker.lastName}
                        </div>
                      ),
                    },
                    {
                      header: 'Notes / Payout description',
                      render: (row) => (
                        <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                          {row.notes || 'Base salary disbursement'}
                        </span>
                      ),
                    },
                    {
                      header: 'Gross paycheck',
                      render: (row) => (
                        <span style={{ fontWeight: 600, color: 'var(--neutral-800)' }}>
                          {row.currency} {row.grossAmount.toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      header: 'Funding Status',
                      render: (row) => <Badge status={row.status} />,
                    },
                    {
                      header: 'Actions',
                      render: (row) => (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {row.status === 'PENDING' && canManagePayroll && !['PAID', 'CLOSED'].includes(selectedCycle.status) && (
                            <>
                              <button onClick={() => updateItemStatusMutation.mutate({ itemId: row.id, status: 'APPROVED' })} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--success-text)' }}>
                                Approve
                              </button>
                              <button onClick={() => updateItemStatusMutation.mutate({ itemId: row.id, status: 'HELD' })} className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'var(--danger-text)' }}>
                                Hold
                              </button>
                            </>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  data={selectedCycle.payrollItems || []}
                  emptyMessage="No paycheck slips issued in this period."
                  pageSize={5}
                />
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
              <span style={{ fontSize: '3rem' }}>💸</span>
              <h3 style={{ color: 'var(--neutral-700)', fontWeight: 600 }}>No Payroll Cycle Selected</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
                Select an active or closed payroll cycle period from the ledger checklist to verify disbursement records.
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .cycle-item:hover {
          background-color: var(--neutral-50) !important;
          border-color: var(--brand-500) !important;
        }
      `}</style>
    </div>
  );
};
