/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    return {
      beforeFiles: [
        // Serve the hand-built static landing (public/landing.html) at the root.
        { source: '/', destination: '/landing.html' },
      ],
    };
  },
};
module.exports = nextConfig;
