import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@velor/core", "@velor/contracts", "@velor/config"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
