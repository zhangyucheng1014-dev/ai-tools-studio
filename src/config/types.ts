export type ToolProvider =
  | "TikTokDownloader"
  | "ContentRewriter"
  | "HeyGem"
  | "GPT-SoVITS"
  | "OpenAICompatible"
  | "MoneyPrinterTurbo"
  | "SocialAutoUpload";

export type Tool = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  provider: ToolProvider;
  icon: string;
  inputs: string[];
  instructions: string[];
  /** 这个工具主要接收文件而非文字 */
  fileBased?: boolean;
};

export type ToolRunInput = {
  toolSlug: string;
  prompt: string;
  options?: Record<string, string | number | boolean>;
  /** base64 encoded file data */
  fileData?: string;
  fileName?: string;
  fileType?: string;
};

export type ToolRunResult = {
  ok: boolean;
  output: string;
  provider: ToolProvider;
  mock: boolean;
};
