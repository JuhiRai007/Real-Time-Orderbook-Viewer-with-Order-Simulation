/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable CORS and API proxying for cryptocurrency exchanges
  async rewrites() {
    return [
      // OKX API proxy
      {
        source: '/api/okx/:path*',
        destination: 'https://www.okx.com/api/v5/:path*'
      },
      // Bybit API proxy
      {
        source: '/api/bybit/:path*',
        destination: 'https://api.bybit.com/v5/:path*'
      },
      // Deribit API proxy
      {
        source: '/api/deribit/:path*',
        destination: 'https://www.deribit.com/api/v2/:path*'
      }
    ];
  },

  // Headers configuration for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ];
  },

  // Webpack configuration for WebSocket support
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },

  // Environment variables (optional)
  env: {
    CUSTOM_KEY: 'orderbook-viewer',
  },

  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react']
  },

  // Image optimization (if you plan to use exchange logos)
  images: {
    domains: ['www.okx.com', 'www.bybit.com', 'www.deribit.com'],
    unoptimized: false
  }
}

module.exports = nextConfig
