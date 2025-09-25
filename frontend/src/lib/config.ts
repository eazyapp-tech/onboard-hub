// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://onboard-hun-backend-1.onrender.com'
  : 'http://localhost:4000';

export { API_BASE_URL };
