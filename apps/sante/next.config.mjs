/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@app-store/core-db',
    '@app-store/core-email',
    '@app-store/core-auth',
    '@app-store/core-ui',
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
