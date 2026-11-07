import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // Join and invite links carry a secret in the URL: don't pass it on through
  // Referer, and keep it out of search engines. Keep this list in step with
  // SECRET_URL_PREFIXES in src/lib/routes.ts (a test checks it).
  async headers() {
    const secretUrlHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/join/:path*", headers: secretUrlHeaders },
      { source: "/invite/:path*", headers: secretUrlHeaders },
    ];
  },
  // Old addresses. Each page has exactly one URL (see docs/routes.md), so these
  // send bookmarks and shared links to it. Redirects run before the proxy.
  async redirects() {
    return [
      { source: "/org/:id", destination: "/workspace/:id", permanent: false },
      { source: "/org/:id/:path*", destination: "/workspace/:id/:path*", permanent: false },
      { source: "/orgs/new", destination: "/workspace/new", permanent: false },
      { source: "/setup", destination: "/workspace/new", permanent: false },
    ];
  },
};

export default nextConfig;
