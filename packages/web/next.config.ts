import { resolve } from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@emovo/shared"],
  outputFileTracingRoot: resolve(__dirname, "../../"),
};

export default nextConfig;
