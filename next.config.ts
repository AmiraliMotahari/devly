import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  partialPrefetching: true,
  cacheComponents: true,
  experimental: {
    typedEnv: true,
    useOffline: true,
    // Expose the instant() testing API in production builds only when the
    // e2e rig explicitly opts in (never in real production deploys).
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
};

export default nextConfig;
