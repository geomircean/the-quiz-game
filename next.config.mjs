import nextEnv from '@next/env';

// next.config is evaluated before Next loads .env files, so load them here
// to read NEXT_DEV_ORIGINS (dev-only; see allowedDevOrigins below).
// @next/env is CommonJS, so reach loadEnvConfig via the default import.
nextEnv.loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site — the browser talks to Firebase directly, no server.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // DEV ONLY (ignored in the production build): let phones/other devices on
  // the LAN reach the dev server, which Next 16 blocks by default. Set
  // NEXT_DEV_ORIGINS to your Mac's LAN IP(s), comma-separated, for on-device
  // testing — e.g. NEXT_DEV_ORIGINS=192.168.0.109
  allowedDevOrigins: (process.env.NEXT_DEV_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

export default nextConfig;
