// API Configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://onboard-hub.onrender.com'
  : 'http://localhost:4000';

export { API_BASE_URL };
