import type { Tool } from "./types";

export const tools: Tool[] = [
  {
    slug: "video-downloader",
    name: "视频下载",
    tagline: "短视频链接解析、去水印下载",
    description: "粘贴短视频链接，自动解析视频信息并下载高清无水印版本，支持封面提取和字幕导出。",
    provider: "TikTokDownloader",
    icon: "download",
    inputs: ["视频链接", "画质选择"],
    instructions: [
      "粘贴短视频分享链接",
      "选择需要的画质",
      "提交后获取下载链接和素材文件"
    ]
  },
  {
    slug: "content-rewriter",
    name: "文案改写",
    tagline: "AI 智能洗稿、改写、原创化",
    description: "输入原文，AI 自动进行语义重述和风格转换，提升内容原创度，适合内容创作和运营场景。",
    provider: "ContentRewriter",
    icon: "pen",
    inputs: ["原文内容", "改写风格", "目标字数"],
    instructions: [
      "粘贴需要改写的原文",
      "选择改写风格（正式/口语/营销等）",
      "每次运行可获得不同表达方式的改写结果"
    ]
  },
  {
    slug: "digital-human",
    name: "数字人口播",
    tagline: "上传你的照片，输入文案，AI 生成你出镜的口播视频",
    description: "上传一张正面照片，输入口播文案，AI 让照片中的人开口说话。自动加 Ken Burns 电影级缓推动效，看起来像专业剪辑而非 AI 生成。",
    provider: "HeyGem",
    icon: "bot",
    inputs: ["你的照片", "口播文案"],
    instructions: [
      "上传一张正面清晰照片（半身照效果最佳）",
      "输入口播文案",
      "选择画面比例",
      "AI 生成照片人物说话的视频",
      "自动叠加 Ken Burns 缓推动效"
    ],
    fileBased: true
  },
  {
    slug: "ai-voice",
    name: "AI 配音",
    tagline: "文字转语音，多音色可选",
    description: "输入文字，选择音色和情绪，生成自然流畅的配音音频。支持多角色、多情绪，适合视频配音和有声内容制作。",
    provider: "GPT-SoVITS",
    icon: "mic",
    inputs: ["配音文字", "音色", "语速", "情绪"],
    instructions: [
      "输入需要配音的文字内容",
      "选择音色（女声/男声多种可选）",
      "调整语速和情绪风格",
      "生成配音音频文件"
    ]
  },
  {
    slug: "subtitle-generator",
    name: "字幕生成",
    tagline: "上传视频/音频，自动生成字幕",
    description: "上传音视频文件，AI 自动识别语音并生成 SRT/VTT 字幕，支持多语言翻译，适合视频后期和内容本地化。",
    provider: "OpenAICompatible",
    icon: "captions",
    inputs: ["音视频文件", "源语言", "目标语言"],
    instructions: [
      "上传需要生成字幕的音视频文件",
      "选择文件中的语言和目标翻译语言",
      "提交后自动识别语音并生成字幕文件"
    ],
    fileBased: true
  },
  {
    slug: "video-factory",
    name: "视频制作",
    tagline: "输入文案，自动剪辑生成短视频",
    description: "输入文案主题，自动匹配素材、BGM、字幕样式，一键生成完整短视频。支持批量制作，适合内容矩阵运营。",
    provider: "MoneyPrinterTurbo",
    icon: "film",
    inputs: ["视频主题", "文案内容", "BGM风格", "字幕样式", "画面比例"],
    instructions: [
      "填写视频主题和文案",
      "选择 BGM 风格和字幕样式",
      "选择画面比例",
      "提交后自动生成短视频"
    ]
  },
  {
    slug: "multi-platform-publish",
    name: "一键发布",
    tagline: "视频多平台自动分发",
    description: "上传视频，一键发布到抖音、小红书、B站、TikTok 等多个平台，支持定时发布和账号管理，省去重复操作。",
    provider: "SocialAutoUpload",
    icon: "cloud-upload",
    inputs: ["视频文件", "标题和描述", "发布平台", "定时发布时间"],
    instructions: [
      "上传制作好的视频文件",
      "填写标题和描述文案",
      "勾选要发布的平台",
      "设置发布时间（或立即发布）"
    ],
    fileBased: true
  }
];

export function getTool(slug: string) {
  return tools.find((t) => t.slug === slug);
}
