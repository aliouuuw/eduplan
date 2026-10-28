import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Memoizes client components. Cuts repeat renders on the dashboard screens.
  reactCompiler: true,
  // The dock and the phone tab bar live bottom-left; keep the dev badge off them.
  devIndicators: { position: "top-right" },
  experimental: {
    // framer-motion is only used by the calendar. Keep the rest of the app off that barrel.
    optimizePackageImports: ["framer-motion"],
  },
};

export default nextConfig;
