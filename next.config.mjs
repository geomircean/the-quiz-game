/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site — the browser talks to Firebase directly, no server.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
