import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  partialPrefetching: true,
  cacheComponents: true,
  experimental: {
    typedEnv: true,
    useOffline: true,
  },
};

export default nextConfig;
