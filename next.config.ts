import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // The join link is a secret in the URL: don't pass it on through Referer,
  // and keep it out of search engines.
  async headers() {
    return [
      {
        source: "/join/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/workspace/:id",
        destination: "/org/:id",
      },
      {
        source: "/org/:id/officers",
        destination: "/workspace/:id/officers",
      },
    ];
  },
};

export default nextConfig;
