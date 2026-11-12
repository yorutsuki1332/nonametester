import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 本機代理（如 Clash fake-ip）會把 Blob 網域解析成 198.18.x.x。
    // 允許的來源仍只限下方 remotePatterns。
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hhsjzpcnw03pegqu.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;