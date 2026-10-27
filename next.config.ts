import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memoizes client components. Cuts repeat renders on the dashboard screens.
  reactCompiler: true,
  experimental: {
    // framer-motion is only used by the calendar. Keep the rest of the app off that barrel.
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
