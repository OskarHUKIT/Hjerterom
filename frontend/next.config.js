/** @type {import('next').NextConfig} */
// Web/Vercel config - no static export (allows auth callback, dynamic routes)
// Mobile builds use next.config.mobile.js via build-mobile.js
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    unoptimized: true,
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3002',
  },
  // Disable features that don't work with static export
  trailingSlash: true,
}

module.exports = nextConfig
