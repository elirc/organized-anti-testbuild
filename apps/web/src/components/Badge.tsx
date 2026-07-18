import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const getBadgeStyle = (statusVal: string): React.CSSProperties => {
    const norm = statusVal.toUpperCase();

    // Success (green)
    if (['ACTIVE', 'APPROVED', 'DONE', 'PAID', 'RESOLVED', 'COMPLETED'].includes(norm)) {
      return {
        backgroundColor: 'var(--success-bg)',
        color: 'var(--success-text)',
        border: '1px solid var(--success-border)',
      };
    }

    // Warning (amber)
    if (['IN_REVIEW', 'COLLECTING_INPUTS', 'REVIEW', 'MEDIUM', 'IN_PROGRESS'].includes(norm)) {
      return {
        backgroundColor: 'var(--warning-bg)',
        color: 'var(--warning-text)',
        border: '1px solid var(--warning-border)',
      };
    }

    // Danger (red)
    if (['TERMINATED', 'SUSPENDED', 'REJECTED', 'INACTIVE', 'BLOCKED', 'HIGH', 'URGENT'].includes(norm)) {
      return {
        backgroundColor: 'var(--danger-bg)',
        color: 'var(--danger-text)',
        border: '1px solid var(--danger-border)',
      };
    }

    // Info (blue)
    if (['SENT', 'ELIGIBLE', 'ENROLLED', 'LOW', 'OPEN'].includes(norm)) {
      return {
        backgroundColor: 'var(--info-bg)',
        color: 'var(--info-text)',
        border: '1px solid var(--info-border)',
      };
    }

    // Pending (purple)
    if (['DRAFT', 'PENDING_REVIEW', 'PENDING', 'HELD'].includes(norm)) {
      return {
        backgroundColor: 'var(--pending-bg)',
        color: 'var(--pending-text)',
        border: '1px solid var(--pending-border)',
      };
    }

    // Default Gray
    return {
      backgroundColor: 'var(--neutral-100)',
      color: 'var(--neutral-600)',
      border: '1px solid var(--neutral-200)',
    };
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.625rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-full)',
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
        width: 'max-content',
        ...getBadgeStyle(status),
      }}
    >
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
};
