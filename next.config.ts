import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
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
        destination: "/me/:username",
        permanent: false
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
    ];
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
