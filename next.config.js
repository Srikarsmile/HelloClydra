/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'react-markdown'],
    // Note: Turbopack is enabled via CLI flags, not config in Next.js 15
  },
  
  // Turbopack configuration for Next.js 15+
  turbopack: {
    rules: {
      // Modern SVG handling for Turbopack
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Compiler optimizations - SWC is default in Next.js 15+
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    styledComponents: true, // Enable styled-components support if used
  },
  
  // Webpack optimizations for faster builds
  webpack: (config, { isServer, dev }) => {
    // Performance optimizations
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }

    // Resolve fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }

    // Optimize for faster rebuilds
    config.watchOptions = {
      poll: false,
      ignored: /node_modules/,
    }

    return config
  },
  // webpack: (config, { isServer }) = {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //     }
  //   }
  //   return config
  // },
  
  // Compression
  compress: true,
  
  // Static optimization
  trailingSlash: false,
  
  // Allow cross-origin requests in development
  allowedDevOrigins: [
    'localhost',
    '*.local',
    '192.168.0.*',
    '192.168.1.*',
    '10.0.0.*'
  ],
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.dev; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: https://*.clerk.accounts.dev https://*.clerk.dev wss:; frame-ancestors 'none';",
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },
};

module.exports = nextConfig;
