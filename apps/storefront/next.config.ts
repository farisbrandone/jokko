import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Hôte du stockage objet (images produits), à autoriser pour l'optimiseur
// d'images de Next (`/_next/image`) — sinon 400. Par défaut : MinIO de dev.
const mediaUrl = new URL(process.env.MEDIA_ORIGIN ?? 'http://localhost:59000');
const mediaPattern = {
  protocol: mediaUrl.protocol.replace(':', '') as 'http' | 'https',
  hostname: mediaUrl.hostname,
};

const securityHeaders = [
  // La vitrine peut être intégrée par le vendeur sur son propre site → SAMEORIGIN.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  {
    // `unsafe-inline` scripts : limitation connue de Next (bootstrap inline) —
    // à durcir en nonce + `strict-dynamic` ultérieurement. Images marchand : tout HTTPS.
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ['@jokko/contracts', '@jokko/ui'],
  images: {
    remotePatterns: [
      mediaPattern,
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
