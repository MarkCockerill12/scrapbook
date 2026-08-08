import type { NextConfig } from "next";

/**
 * Assets are referenced as same-origin `/media/...` paths and rewritten to R2 at the
 * edge, rather than pointing at `*.r2.dev` directly.
 *
 * This is the LofiWeb pattern and it exists for a reason found the hard way there:
 * school and corporate networks block third-party domains like `*.r2.dev` outright,
 * and transparent proxies mangle CORS headers. Same-origin paths sidestep both.
 *
 * Set NEXT_PUBLIC_ASSET_SOURCE=r2 to read from the bucket; anything else serves the
 * locally processed copies under /dev-assets, which is how we review before uploading.
 */
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_PREFIX = (process.env.R2_PREFIX ?? "scrapbook").replace(/^\/+|\/+$/g, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!R2_PUBLIC_URL) return [];
    return [
      {
        source: "/media/:path*",
        destination: `${R2_PUBLIC_URL}/${R2_PREFIX}/:path*`,
      },
    ];
  },
};

export default nextConfig;
