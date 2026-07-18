import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Badge } from '../components/Badge';
import { Table } from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  SupportCaseCreateSchema,
  SupportCaseCreateInput,
  SupportCaseCommentCreateSchema,
  SupportCaseCommentCreateInput,
  SupportStatus,
  SupportCategory,
  SupportPriority,
  UserRole,
} from '@gwos/shared';

interface SupportCase {
  id: string;
  tenantId: string;
  workerId: string | null;
  companyId: string | null;
  createdByUserId: string;
  assignedToUserId: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; email: string; role: string };
  assignedTo: { id: string; firstName: string; email: string } | null;
  comments?: {
    id: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
    author: { firstName: string; email: string; role: string };
  }[];
}

export const SupportCases: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Comment input
  const [commentBody, setCommentBody] = useState('');
  const [commentIsInternal, setCommentIsInternal] = useState(false);

  // 1. Fetch Support Cases
  const { data: cases = [], isLoading } = useQuery<SupportCase[]>({
    queryKey: ['supportCases'],
    queryFn: async () => {
      const response = await api.get('/support-cases');
      return response.data;
    },
  });

  // 2. Fetch Selected Case Detail (includes comments timeline)
  const { data: selectedCase, isLoading: isDetailLoading } = useQuery<SupportCase>({
    queryKey: ['supportCaseDetail', selectedCaseId],
    queryFn: async () => {
      const response = await api.get(`/support-cases/${selectedCaseId}`);
      return response.data;
    },
    enabled: !!selectedCaseId,
  });

  // Create Case Mutation
  const createCaseMutation = useMutation({
    mutationFn: async (input: SupportCaseCreateInput) => {
      return api.post('/support-cases', input);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['supportCases'] });
      setShowCreateForm(false);
      setSelectedCaseId(res.data.id);
      resetForm();
    },
    onError: (err: any) => {
      setCreationError(err.response?.data?.message || 'Failed to submit support case');
    },
  });

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async (input: SupportCaseCommentCreateInput) => {
      return api.post(`/support-cases/${selectedCaseId}/comments`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportCaseDetail', selectedCaseId] });
      setCommentBody('');
      setCommentIsInternal(false);
    },
  });

  // Claim Case Mutation (assign to current user)
  const claimCaseMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/support-cases/${selectedCaseId}`, { assignedToUserId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportCases'] });
      queryClient.invalidateQueries({ queryKey: ['supportCaseDetail', selectedCaseId] });
    },
  });

  // Close Case Mutation
  const closeCaseMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/support-cases/${selectedCaseId}`, { status: SupportStatus.CLOSED });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportCases'] });
      queryClient.invalidateQueries({ queryKey: ['supportCaseDetail', selectedCaseId] });
    },
  });

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<SupportCaseCreateInput>({
    resolver: zodResolver(SupportCaseCreateSchema),
  });

  const onSubmit = (data: SupportCaseCreateInput) => {
    setCreationError(null);
    createCaseMutation.mutate(data);
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentBody.trim().length < 2) return;
    addCommentMutation.mutate({
      body: commentBody,
      isInternal: commentIsInternal,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const isOpsRole = user?.role === UserRole.PLATFORM_ADMIN || user?.role === UserRole.INTERNAL_OPS;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.8rem' }}>Customer Support Desk</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            File compliance queries, manage health coverage questions, and track resolution timelines.
          </p>
        </div>
        {!showCreateForm && (
          <button onClick={() => { setShowCreateForm(true); setSelectedCaseId(null); }} className="btn btn-primary">
            💬 Open Support Ticket
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem' }}>
        {/* Left Column: Tickets list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>💬</span> Active Tickets ({cases.length})
            </h3>

            {cases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-400)', fontSize: '0.85rem' }}>
                No active support tickets found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cases.map((c) => {
                  const active = c.id === selectedCaseId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCaseId(c.id); setShowCreateForm(false); }}
                      style={{
                        padding: '1rem',
                        border: '1px solid',
                        borderColor: active ? 'var(--brand-500)' : 'var(--neutral-200)',
                        backgroundColor: active ? 'var(--brand-50)' : 'white',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                      }}
                      className="ticket-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: active ? 'var(--brand-700)' : 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {c.subject}
                        </h4>
                        <Badge status={c.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--neutral-400)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
                        <span>📂 {c.category}</span>
                        <span>⚠️ {c.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timelines OR Create Case form */}
        <div>
          {showCreateForm ? (
            <div className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>💬 Open New Support Ticket</h3>
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
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Classification Category</label>
                    <select className="form-select" {...register('category')}>
                      <option value="GENERAL">General Queries</option>
                      <option value="ONBOARDING">Onboarding blockers</option>
                      <option value="PAYROLL">Payroll & Payout funding</option>
                      <option value="BENEFITS">Medical & Welfare Coverages</option>
                      <option value="DOCUMENTS">Compliance file uploads</option>
                      <option value="CONTRACT">Employment Contract queries</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Impact Priority</label>
                    <select className="form-select" {...register('priority')}>
                      <option value="LOW">Low priority</option>
                      <option value="MEDIUM">Medium priority</option>
                      <option value="HIGH">High priority</option>
                      <option value="URGENT">Urgent priority</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Short Subject Summary</label>
                  <input type="text" placeholder="e.g. Health insurance carrier selection" className="form-input" {...register('subject')} />
                  {errors.subject && <span className="form-error">{errors.subject.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Detailed Description</label>
                  <textarea placeholder="Describe your query in detail so our operations team can resolve it..." rows={4} className="form-textarea" {...register('description')} />
                  {errors.description && <span className="form-error">{errors.description.message}</span>}
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                  💬 Submit Support Ticket
                </button>
              </form>
            </div>
          ) : selectedCase ? (
            <div className="card" style={{ padding: '2rem' }}>
              {/* Ticket header */}
              <div style={{ borderBottom: '1px solid var(--neutral-200)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{selectedCase.subject}</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--neutral-400)', fontWeight: 500 }}>
                      Ticket ID: {selectedCase.id} | Opened: {new Date(selectedCase.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Badge status={selectedCase.status} />
                  </div>
                </div>

                {/* Technical grids */}
                <div className="grid-3" style={{ marginTop: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Classification</span>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-700)' }}>📂 {selectedCase.category}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Impact Priority</span>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-700)' }}>⚠️ {selectedCase.priority}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)', fontWeight: 600, textTransform: 'uppercase' }}>Owner Assignee</span>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
                      👤 {selectedCase.assignedTo ? selectedCase.assignedTo.firstName : 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Operations buttons */}
                {isOpsRole && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                    {!selectedCase.assignedTo && (
                      <button onClick={() => claimCaseMutation.mutate()} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                        Claim ticket
                      </button>
                    )}
                    {selectedCase.status !== 'CLOSED' && (
                      <button onClick={() => closeCaseMutation.mutate()} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
                        Close ticket
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description card */}
              <div style={{ backgroundColor: 'var(--neutral-50)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--neutral-200)', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', fontWeight: 700 }}>ORIGINAL TICKET INQUIRY</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--neutral-800)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                  {selectedCase.description}
                </p>
              </div>

              {/* Comments stream list */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem' }}>💬 Timeline Conversation ({selectedCase.comments?.length || 0})</h3>
                
                {isDetailLoading ? (
                  <div style={{ padding: '1rem', color: 'var(--neutral-400)', textAlign: 'center' }}>Loading timeline...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    {selectedCase.comments?.map((c) => {
                      const noteStyle: React.CSSProperties = c.isInternal
                        ? { backgroundColor: 'var(--pending-bg)', border: '1px solid var(--pending-border)' }
                        : { backgroundColor: 'white', border: '1px solid var(--neutral-200)' };
                      
                      return (
                        <div key={c.id} style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', ...noteStyle }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.author.firstName}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>({c.author.role.replace(/_/g, ' ')})</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {c.isInternal && <span style={{ padding: '0.15rem 0.4rem', backgroundColor: 'var(--pending-border)', color: 'var(--pending-text)', fontSize: '0.65rem', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}>INTERNAL ONLY</span>}
                              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--neutral-800)' }}>{c.body}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment box editor */}
                {selectedCase.status !== 'CLOSED' && (
                  <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <textarea placeholder="Write a response..." value={commentBody} onChange={(e) => setCommentBody(e.target.value)} required rows={3} className="form-textarea" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {isOpsRole ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--pending-text)', fontWeight: 600, cursor: 'pointer' }}>
                          <input type="checkbox" checked={commentIsInternal} onChange={(e) => setCommentIsInternal(e.target.checked)} />
                          🔒 Post as Internal-only Note (hidden from clients & workers)
                        </label>
                      ) : <div />}

                      <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>
                        Post Response
                      </button>
                    </div>
                  </form>
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
              <span style={{ fontSize: '3rem' }}>💬</span>
              <h3 style={{ color: 'var(--neutral-700)', fontWeight: 600 }}>No Support Ticket Selected</h3>
              <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
                Select a ticket from the active inquiry checklist on the left, or create a new support request.
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .ticket-item:hover {
          background-color: var(--neutral-50) !important;
          border-color: var(--brand-500) !important;
        }
      `}</style>
    </div>
  );
};
