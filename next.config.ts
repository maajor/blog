import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['127.0.0.1', '192.168.1.62'],
};

export default nextConfig;
