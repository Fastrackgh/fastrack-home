import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

// One ID per build. The build's worker processes load this file again, but they
// inherit the environment, so they all see the first value. The staff service
// worker re-saves its offline pages when the ID changes (OFF-1).
process.env.FASTRACK_BUILD_ID ||= Date.now().toString(36);
const buildId = process.env.FASTRACK_BUILD_ID;

/**
 * Addresses come from settings, never from code (docs/deployment.md). The API
 * address is baked into the build, so a production build without it stops
 * here rather than ship an app that calls localhost. Development falls back
 * to http://localhost:3000/api (src/lib/api-client.ts).
 */
export function checkSettings(phase, env = process.env) {
  if (phase !== PHASE_PRODUCTION_BUILD) return;
  if (!env.NEXT_PUBLIC_API_URL)
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. A production build needs the backend API address, e.g. NEXT_PUBLIC_API_URL=https://api.example.com/api (see .env.example).',
    );
  for (const name of ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_SITE_URL']) {
    if (!env[name]) continue;
    try {
      new URL(env[name]);
    } catch {
      throw new Error(`${name} is not a full address: "${env[name]}" (see .env.example).`);
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => buildId,
  env: { FASTRACK_BUILD_ID: buildId },
  // The dev badge sits over the parent app's Home tab at phone width (QA-263).
  devIndicators: false,
  async headers() {
    return [
      {
        // Browsers must always fetch the latest parent portal service worker.
        source: '/parent-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/parent-app/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
      {
        // Browsers must always fetch the latest staff portal service worker.
        source: '/school-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/school-app/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ];
  },
};

const config = (phase) => {
  checkSettings(phase);
  return nextConfig;
};

export default config;
