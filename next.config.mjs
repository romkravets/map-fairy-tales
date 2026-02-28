/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'd1ei2xrl63k822.cloudfront.net', // Allow CloudFront images for story previews
    ],
  },
};


export default nextConfig;
