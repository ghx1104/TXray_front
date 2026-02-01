/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Wagmi optional connector 'porto/internal' may be missing; avoid build failure
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "porto/internal": false,
    };
    return config;
  },
};

module.exports = nextConfig;
