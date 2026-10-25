/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
    ];
  },
};

export default nextConfig;
