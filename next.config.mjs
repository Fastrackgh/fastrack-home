// One ID per build. The build's worker processes load this file again, but they
// inherit the environment, so they all see the first value. The staff service
// worker re-saves its offline pages when the ID changes (OFF-1).
process.env.FASTRACK_BUILD_ID ||= Date.now().toString(36);
const buildId = process.env.FASTRACK_BUILD_ID;

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

export default nextConfig;
