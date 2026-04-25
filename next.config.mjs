/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // CJS adapter + webpack: avoid undefined.call on /api/auth/[...nextauth]
    serverComponentsExternalPackages: ["mongodb", "@next-auth/mongodb-adapter"],
  },
};

export default nextConfig;
