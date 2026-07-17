/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Only allow dev origins in development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['192.168.0.174', 'localhost', '127.0.0.1'],
  }),
};

module.exports = nextConfig;
