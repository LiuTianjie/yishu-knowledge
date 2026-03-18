import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: ["@lancedb/lancedb", "apache-arrow"],
};

export default nextConfig;
