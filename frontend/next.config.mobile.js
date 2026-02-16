/** @type {import('next').NextConfig} */
// Mobile build configuration - uses static export for Capacitor
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
  },
  // Disable features that don't work with static export
  trailingSlash: true,
}

module.exports = nextConfig
