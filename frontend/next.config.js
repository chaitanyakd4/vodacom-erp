/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
};

// If there are other configurations, merge them here
const config = {
    ...nextConfig,
    // Add allowedDevOrigins to fix the webpack-hmr block
    // We add common local network prefixes or the specific IP
    serverExternalPackages: [],
};

// Check if Next.js version supports allowedDevOrigins and inject it
// (Note: Next.js 15+ may expect experimental or just root-level property for this, but let's follow the console warning)
module.exports = {
  ...config,
  allowedDevOrigins: ['192.168.0.174', 'localhost', '127.0.0.1'],
};
