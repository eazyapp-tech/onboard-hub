// API Configuration
// Vercel provides VERCEL_ENV: 'production' | 'preview' | 'development'
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Production environment
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production') {
    return 'https://onboard-hub.onrender.com';
  }
  
  // Preview/Staging environment (Vercel preview deployments)
  if (process.env.VERCEL_ENV === 'preview') {
    return 'https://onboard-hub-backend-staging.onrender.com';
  }
  
  // Local development
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

export { API_BASE_URL };
