/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  // Server settings
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  // Configure env variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Configure redirects
  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/auth',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
