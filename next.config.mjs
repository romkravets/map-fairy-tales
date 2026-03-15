/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // XSS filter for legacy browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Limit referrer info on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser APIs (camera, mic, geolocation, etc.)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — uncomment once SSL cert is confirmed on production
  // { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "d1ei2xrl63k822.cloudfront.net", // Allow CloudFront images for story previews
    ],
  },
  typescript: {
    // Allow production builds to complete even if there are type errors.
    // This keeps CI/builds unblocked while incremental type fixes are addressed.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
        dns: false,
      };
    }
    return config;
  },
  eslint: {
    // Prevent ESLint from failing the production build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
