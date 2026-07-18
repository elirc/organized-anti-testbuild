import React, { useState } from 'react';

interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  pageSize = 8,
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '2.5rem',
            height: '2.5rem',
            border: '3px solid var(--neutral-200)',
            borderTopColor: 'var(--brand-500)',
            borderRadius: 'var(--radius-full)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', fontWeight: 500 }}>
          Loading records...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          backgroundColor: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '2.5rem' }}>📁</span>
        <h4 style={{ color: 'var(--neutral-700)', fontWeight: 600 }}>No Data Available</h4>
        <p style={{ color: 'var(--neutral-400)', fontSize: '0.875rem', maxWidth: '300px' }}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Client-side pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        style={{
          overflowX: 'auto',
          backgroundColor: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--neutral-50)',
                borderBottom: '1px solid var(--neutral-200)',
              }}
            >
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: '0.875rem 1.25rem',
                    fontWeight: 600,
                    color: 'var(--neutral-600)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom:
                    rowIdx < paginatedData.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                  transition: 'var(--transition-smooth)',
                }}
                className="table-row-hover"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      padding: '1rem 1.25rem',
                      color: 'var(--neutral-800)',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <style>{`
          .table-row-hover:hover {
            background-color: var(--neutral-50);
          }
        `}</style>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, data.length)} of{' '}
            {data.length} records
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
