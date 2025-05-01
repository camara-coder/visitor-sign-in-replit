/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'development' 
          ? 'http://localhost:8000/api/:path*' 
          : '/api/:path*',
      },
    ];
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
  },
};

module.exports = nextConfig;
