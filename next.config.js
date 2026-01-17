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
}

module.exports = nextConfig
