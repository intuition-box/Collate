const distDirOverride = process.env.COLLATE_NEXT_DIST_DIR?.trim();
const isNetlifyBuild = process.env.NETLIFY === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Windows dev and build processes from contending for the same locked trace file.
  distDir: distDirOverride || (isNetlifyBuild ? '.next' : process.env.NODE_ENV === 'development' ? '.next-dev' : '.next-build'),
  experimental: process.env.NODE_ENV === 'production' ? { cpus: 1 } : {},
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /ox[\\/]_esm[\\/]tempo[\\/]internal[\\/]virtualMasterPool\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
};

export default nextConfig;
