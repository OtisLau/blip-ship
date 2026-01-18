/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Next.js Image optimization for external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Allow dev server access from any origin (for local network testing)
  allowedDevOrigins: ['*'],
}

module.exports = nextConfig
