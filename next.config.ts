import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  serverExternalPackages: [
    "better-auth",
    "pg",
    "drizzle-orm",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner"
  ],
  devIndicators: false,
  images: {
    remotePatterns: [

      {
        protocol: "https",
        hostname: "chapmee.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "media.chapmee.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "images.dmca.com",
        pathname: "/**"
      }
      // TODO: tighten to Vietnix S3 public CDN hostname when production URL is fixed.
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Custom sitemap index + child files (XSL + pagination).
        { source: "/sitemap.xml", destination: "/internal/sitemap-index" },
        { source: "/sitemap/:id.xml", destination: "/internal/sitemap/:id" }
      ]
    };
  },
  async redirects() {
    return [
      {
        source: "/landing",
        destination: "/",
        permanent: true
      },
      {
        source: "/logo.png",
        destination: "/brand/chapmee-wordmark.png",
        permanent: false
      },
      {
        source: "/creator",
        destination: "/studio",
        permanent: false
      },
      {
        source: "/creator/dashboard",
        destination: "/studio",
        permanent: false
      },
      {
        source: "/creator/setup",
        destination: "/studio/setup",
        permanent: false
      },
      {
        source: "/creator/write",
        destination: "/studio/stories/new",
        permanent: false
      },
      {
        source: "/creator/status",
        destination: "/studio/status",
        permanent: false
      },
      {
        source: "/creator/analytics",
        destination: "/studio/analytics",
        permanent: false
      },
      {
        source: "/creator/stories",
        destination: "/studio/stories",
        permanent: false
      },
      {
        source: "/creator/stories/new",
        destination: "/studio/stories/new",
        permanent: false
      },
      {
        source: "/creator/stories/:storyId/edit",
        destination: "/studio/stories/:storyId/edit",
        permanent: false
      },
      {
        source: "/creator/stories/:storyId/episodes",
        destination: "/studio/stories/:storyId/chapters",
        permanent: false
      },
      {
        source: "/creator/stories/:storyId/episodes/new",
        destination: "/studio/stories/:storyId/chapters/new",
        permanent: false
      },
      {
        source: "/creator/stories/:storyId/episodes/:episodeId/edit",
        destination: "/studio/stories/:storyId/chapters/:episodeId/edit",
        permanent: false
      },
      {
        source: "/studio/stories/:storyId/episodes/new",
        destination: "/studio/stories/:storyId/chapters/new",
        permanent: false
      },
      {
        source: "/studio/stories/:storyId/episodes/:episodeId/edit",
        destination: "/studio/stories/:storyId/chapters/:episodeId/edit",
        permanent: false
      },
      {
        source: "/creator/stories/:storyId/episodes/:episodeId/preview",
        destination: "/studio/stories/:storyId/episodes/:episodeId/preview",
        permanent: false
      },
      {
        source: "/creator/calendar",
        destination: "/studio/calendar",
        permanent: false
      },
      {
        source: "/creator/drafts",
        destination: "/studio/drafts",
        permanent: false
      },
      {
        source: "/creator/templates",
        destination: "/studio/templates",
        permanent: false
      },
      {
        source: "/me/creator",
        destination: "/studio",
        permanent: false
      },
      {
        source: "/profile",
        destination: "/me",
        permanent: false
      },
      {
        source: "/profile/:username",
        destination: "/@:username",
        permanent: true
      },
      {
        source: "/u/:username",
        destination: "/@:username",
        permanent: true
      },
      {
        source: "/profile/:username/collections/:collectionId",
        destination: "/me/:username/collections/:collectionId",
        permanent: false
      },
      {
        source: "/genres/:slug",
        destination: "/the-loai/:slug",
        permanent: true
      },
      {
        source: "/truyensangtac",
        destination: "/truyen-sang-tac",
        permanent: false
      },
      {
        source: "/truyen-sangtac",
        destination: "/truyen-sang-tac",
        permanent: false
      },
      {
        source: "/truyendich",
        destination: "/truyen-dich",
        permanent: false
      },
      {
        source: "/truyen-dich-mien-phi",
        destination: "/truyen-dich",
        permanent: false
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        // Dev compile can exceed default chunk load wait during HMR/full reload.
        chunkLoadTimeout: 300_000
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      },
      {
        source: "/favicon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
