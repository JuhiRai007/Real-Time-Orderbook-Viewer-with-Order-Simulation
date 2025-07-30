/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig

module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/okx/:path*',
        destination: 'https://www.okx.com/api/v5/:path*'
      },
      {
        source: '/api/bybit/:path*',
        destination: 'https://api.bybit.com/v5/:path*'
      },
      {
        source: '/api/deribit/:path*',
        destination: 'https://www.deribit.com/api/v2/:path*'
      }
    ];
  }
};
