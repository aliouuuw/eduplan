import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for development
  experimental: {
    turbo: {
      rules: {
        // Handle LICENSE files and other non-JS files
        "*.{txt,md,LICENSE}": {
          loaders: ["raw-loader"],
          as: "*.js",
        },
      },
    },
  },
  // Keep webpack config for production builds
  webpack: (config, { isServer }) => {
    // Ignore LICENSE files and other non-JS files that might be imported
    config.module.rules.push({
      test: /\.(txt|md|LICENSE)$/,
      type: "asset/source",
    });
    
    return config;
  },
};

export default nextConfig;
