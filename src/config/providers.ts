import type { ToolProvider } from "./types";

export type ProviderEndpoint = {
  envKeys: string[];
  path: string;
  apiKeyEnv?: string;
  authHeader: "bearer" | "x-api-key" | "none";
};

export const providerEndpoints: Record<ToolProvider, ProviderEndpoint> = {
  TikTokDownloader: {
    envKeys: ["TIKTOK_DOWNLOADER_ENDPOINT"],
    path: "/api/video/parse",
    authHeader: "none"
  },
  ContentRewriter: {
    envKeys: ["CONTENT_REWRITER_ENDPOINT"],
    path: "/api/rewrite",
    authHeader: "none"
  },
  HeyGem: {
    envKeys: ["HEYGEM_ENDPOINT"],
    path: "/api/avatar/create",
    authHeader: "none"
  },
  "GPT-SoVITS": {
    envKeys: ["GPT_SOVITS_ENDPOINT"],
    path: "/api/audio/create",
    authHeader: "none"
  },
  OpenAICompatible: {
    envKeys: ["OPENAI_BASE_URL"],
    path: "/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    authHeader: "bearer"
  },
  MoneyPrinterTurbo: {
    envKeys: ["MONEY_PRINTER_ENDPOINT"],
    path: "/api/video/render",
    authHeader: "none"
  },
  SocialAutoUpload: {
    envKeys: ["SOCIAL_UPLOAD_ENDPOINT"],
    path: "/api/social/upload",
    authHeader: "none"
  }
};
