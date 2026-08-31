/** @type {import('next').NextConfig} */

/*
 * A packaged build has no Node server, so it needs a static export and
 * unoptimized images. Set BUILD_TARGET=native for the App Store and Play
 * Store bundles and leave it unset for Vercel
 */
const isNative = process.env.BUILD_TARGET === 'native';

const nextConfig = {
  ...(isNative
    ? { output: 'export', images: { unoptimized: true }, trailingSlash: true }
    : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;