import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "base44.app", pathname: "/api/apps/**" },
      { protocol: "https", hostname: "media.base44.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/", destination: "/nl", permanent: true },
      // Legacy URLs from the previous website
      { source: "/diensten", destination: "/nl/tugboat-services", permanent: true },
      { source: "/services-1", destination: "/nl/tugboat-services", permanent: true },
      { source: "/ferry-jo", destination: "/nl/tugboat-services", permanent: true },
      { source: "/vragen", destination: "/nl/tugboat-services#faq", permanent: true },
      { source: "/about", destination: "/nl/about", permanent: true },
      { source: "/contact", destination: "/nl/contact", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
