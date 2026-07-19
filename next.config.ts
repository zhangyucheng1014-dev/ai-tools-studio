import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 桌面版：静态导出，Electron 直接托管
  output: "export",
  // 禁用严格模式以减少开发时的重复渲染
  reactStrictMode: true,
  // 桌面应用不需要图片优化（本地运行）
  images: {
    unoptimized: true,
  },
  // 允许 Electron 文件协议
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://localhost:* file: data: blob:; connect-src 'self' http://localhost:* https://localhost:* file: data: blob: https://*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* blob:; worker-src 'self' blob:; media-src 'self' blob: data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
