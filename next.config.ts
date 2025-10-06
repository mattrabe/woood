import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    DEBUG: process.env.DEBUG,
  }
};

export default nextConfig;
