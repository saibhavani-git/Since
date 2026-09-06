import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Self-contained server bundle, so the Docker image ships only what it runs. */
  output: "standalone",
};

export default nextConfig;
