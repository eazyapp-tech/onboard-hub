// @ts-ignore
/** @type {import("next").NextConfig} */
const config = {
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
  webpack: (config, { isServer }) => {
    // Enhanced node polyfills for postgres and other modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // File system - never needed in browser
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        'perf_hooks': false,

        // Definitely not needed in browser
        child_process: false,
        dns: false,
      };
    }
    return config;
  },
  async rewrites() {
    // Determine backend URL based on environment
    let backend;
    if (process.env.BACKEND_URL) {
      // Use explicit BACKEND_URL if set (from Vercel env vars)
      backend = process.env.BACKEND_URL;
    } else if (process.env.VERCEL_ENV === 'preview') {
      // Preview environment uses staging backend
      backend = 'https://onboard-hub-backend-staging.onrender.com';
    } else if (process.env.NODE_ENV === 'production') {
      // Production uses production backend
      backend = 'https://onboard-hub.onrender.com';
    } else {
      // Local development
      backend = 'http://localhost:4000';
    }
    
    return [
      // keep your source maps passthrough
      { source: '/_next/:path*.map', destination: '/_next/:path*.map' },

      // NEW: proxy API + health to Express backend
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/health',     destination: `${backend}/health` },
    ];
  },
};
export default config;