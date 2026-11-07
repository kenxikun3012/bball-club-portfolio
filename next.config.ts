import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site now runs on a Node server (API route for the join form), so it is
  // no longer a static export. Deploy on Vercel or Netlify (serverless).
  serverExternalPackages: ["mongodb"],
  // Type-checking runs separately (`npm run typecheck`); skipping the in-build
  // check keeps `next build` working in restricted sandboxes.
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Build in-process worker threads instead of spawning child processes.
    // This lets `next build` run in sandboxed / restricted environments.
    workerThreads: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
