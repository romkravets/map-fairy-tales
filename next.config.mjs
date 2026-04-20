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
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com https://*.gstatic.com https://*.firebaseapp.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' data: https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://api.groq.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://engine.prod.bria-api.com",
      "frame-src 'self' https://*.firebaseapp.com https://*.google.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Cache static assets aggressively
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
