import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { LoginSchema, LoginInput, UserRole } from '@gwos/shared';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError(null);
    try {
      await login(data);
      // Retrieve just logged in user role to decide redirect
      const savedUser = localStorage.getItem('gwos_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === UserRole.WORKER) {
          navigate(`/workers/${u.workerId}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login action failed:', err);
      setApiError(err.response?.data?.message || 'Invalid credentials or connection error');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--neutral-950)',
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 40%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem',
          backgroundColor: 'white',
          border: '1px solid var(--neutral-800)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🌐</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--neutral-900)', fontSize: '1.8rem', marginTop: '1rem', letterSpacing: '-0.03em' }}>
            GlobalWorkforce OS
          </h2>
          <p style={{ color: 'var(--neutral-500)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 500 }}>
            Enterprises Employer of Record Console
          </p>
        </div>

        {apiError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}
          >
            ⚠️ {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Email field */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="email">
              Corporate Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="form-input"
              {...register('email')}
              style={{ borderColor: errors.email ? 'var(--danger-text)' : undefined }}
            />
            {errors.email && <span className="form-error">❌ {errors.email.message}</span>}
          </div>

          {/* Password field */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="password">
              Secure Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="form-input"
                {...register('password')}
                style={{
                  paddingRight: '3rem',
                  borderColor: errors.password ? 'var(--danger-text)' : undefined,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--neutral-400)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="form-error">❌ {errors.password.message}</span>}
          </div>

          {/* Submit btn */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              marginTop: '0.5rem',
              boxShadow: '0 4px 10px rgba(99, 102, 241, 0.2)',
            }}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials quick login info box */}
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'var(--neutral-50)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--neutral-600)',
          }}
        >
          <h5 style={{ fontWeight: 700, color: 'var(--neutral-700)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            🔑 Demo Accounts (Password: Password123!)
          </h5>
          <ul style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Platform Admin: <code style={{ fontWeight: 600 }}>platform.admin@example.com</code></li>
            <li>Internal Operations: <code style={{ fontWeight: 600 }}>ops@example.com</code></li>
            <li>Client Admin (ACME): <code style={{ fontWeight: 600 }}>client.admin@acme.example.com</code></li>
            <li>Client HR (ACME): <code style={{ fontWeight: 600 }}>hr@acme.example.com</code></li>
            <li>Worker (US John Doe): <code style={{ fontWeight: 600 }}>worker.one@example.com</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};
