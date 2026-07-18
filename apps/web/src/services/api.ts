import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach authentication token and active tenant context
api.interceptors.request.use(
  (config) => {
    // 1. Inject JWT bearer token
    const token = localStorage.getItem('gwos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Inject Active Tenant Selector Header (used for Platform Admins & Internal Ops to switch contexts)
    const activeTenantId = localStorage.getItem('gwos_active_tenant_id');
    if (activeTenantId) {
      config.headers['x-tenant-id'] = activeTenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: centralized error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Centralized log out on 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('gwos_token');
      localStorage.removeItem('gwos_user');
      localStorage.removeItem('gwos_active_tenant_id');
      // If we are not on the login page already, redirect
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
