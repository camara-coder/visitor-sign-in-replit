/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    API_ENDPOINT: process.env.API_ENDPOINT || 'http://localhost:8000',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_ENDPOINT || 'http://localhost:8000'}/:path*`,
      },
    ];
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:8000',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
};

module.exports = nextConfig;
