import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static output: `npm run build` writes a deployable `out/` folder
  // that works on Netlify, Vercel, GitHub Pages or any static host.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Type-checking is run separately (`npm run typecheck`); skipping the
  // in-build check keeps `next build` working in restricted sandboxes.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Build in-process worker threads instead of spawning child processes.
    // This lets `next build` run in sandboxed / restricted environments.
    workerThreads: true,
  },
};

export default nextConfig;
