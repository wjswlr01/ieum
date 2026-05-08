/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ieum/brewing-logic", "@ieum/types"],
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/admin/analytics",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/api/admin/stats",
        headers: [
          {
            key: "Cache-Control",
            value: "private, max-age=30, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
