/** @type {import('next').NextConfig} */
const nextConfig = {
  
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    // In dev, proxy /api/* to the local backend so we avoid CORS issues.
    // In production (Vercel), NEXT_PUBLIC_API_BASE_URL points directly to the backend.
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' }]
      : []
  },
}
export default nextConfig
