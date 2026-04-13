/** @type {import('next').NextConfig} */
const path = require('path')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** Legg inn eksakt host fra NEXT_PUBLIC_SUPABASE_URL (custom domene / proxy). */
function storageRemotePatterns() {
  const patterns = [
    { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    { protocol: 'http', hostname: '127.0.0.1', pathname: '/storage/v1/object/public/**' },
    { protocol: 'http', hostname: 'localhost', pathname: '/storage/v1/object/public/**' },
    { protocol: 'https', hostname: 'unpkg.com', pathname: '/**' },
  ]
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base?.trim()) return patterns
  try {
    const u = new URL(base.trim())
    const protocol = u.protocol.replace(':', '')
    const entry = {
      protocol,
      hostname: u.hostname,
      pathname: '/storage/v1/object/public/**',
    }
    const dup = patterns.some(
      (p) => p.hostname === entry.hostname && p.protocol === entry.protocol,
    )
    if (!dup) patterns.unshift(entry)
  } catch {
    /* ignore */
  }
  return patterns
}

// Web/Vercel config - no static export (allows auth callback, dynamic routes)
// Mobile builds use next.config.mobile.js via build-mobile.js (static export → images.unoptimized)
const nextConfig = {
  reactStrictMode: true,
  /** Unngå feil Turbopack-root når det finnes flere package-lock (repo root + frontend). */
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ['@react-pdf/renderer'],
  images: {
    unoptimized: false,
    remotePatterns: storageRemotePatterns(),
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:3002',
    /** Endres ved hver Vercel-deploy → nye ?v= på Storage-URLer (hjelper mot gammel PDF-cache). */
    NEXT_PUBLIC_STORAGE_DEPLOY_BUST:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || '',
  },
  // Disable features that don't work with static export
  trailingSlash: true,
}

module.exports = withBundleAnalyzer(nextConfig)
