import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* GramJS (telegram) не бандлится — отдаём его в рантайме из node_modules */
  serverExternalPackages: ["telegram"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
