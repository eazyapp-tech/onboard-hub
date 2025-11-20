// API Configuration
const PROD_BACKEND = 'https://onboard-hub.onrender.com';
const STAGING_BACKEND = 'https://onboard-hub-backend-staging.onrender.com';
const LOCAL_BACKEND = 'http://localhost:4000';

// Helper to detect environment both during build (server) and runtime (client)
const resolveVercelEnv = () => {
  // NEXT_PUBLIC_VERCEL_ENV can be injected from project settings (mirrors VERCEL_ENV)
  if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return process.env.NEXT_PUBLIC_VERCEL_ENV;
  }
  // Server-side / build-time value
  if (typeof process !== 'undefined' && process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV;
  }
  return null;
};

const getApiBaseUrl = () => {
  // 1. Explicit env overrides
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }

  const vercelEnv = resolveVercelEnv();
  if (vercelEnv === 'preview') {
    return STAGING_BACKEND;
  }
  if (vercelEnv === 'production') {
    return PROD_BACKEND;
  }

  // Client-side hostname detection (useful if env vars missing)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('staging')) {
      return STAGING_BACKEND;
    }
    if (hostname.includes('onboard-hub')) {
      return PROD_BACKEND;
    }
  }

  // Fallbacks: production build defaults to prod backend, otherwise localhost
  if (process.env.NODE_ENV === 'production') {
    return PROD_BACKEND;
  }

  return LOCAL_BACKEND;
};

const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL };
