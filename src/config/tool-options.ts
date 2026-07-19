export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "file";
  placeholder?: string;
  options?: string[];
  defaultValue?: string | number;
  /** file type: accepted MIME types */
  accept?: string;
};

export const toolOptions: Record<string, FieldDef[]> = {
  "video-downloader": [
    { key: "quality", label: "画质", type: "select", options: ["1080p", "720p", "480p", "最高画质"], defaultValue: "1080p" }
  ],
  "content-rewriter": [
    { key: "style", label: "改写风格", type: "select", options: ["通用", "口语化", "营销风", "学术风"], defaultValue: "通用" },
    { key: "targetLength", label: "目标字数", type: "number", placeholder: "500", defaultValue: 500 }
  ],
  "digital-human": [
    { key: "photo", label: "上传你的照片", type: "file", accept: "image/*" },
    { key: "aspectRatio", label: "画面比例", type: "select", options: ["9:16（竖屏）", "16:9（横屏）", "2.35:1（电影宽幅）"], defaultValue: "9:16（竖屏）" }
  ],
  "ai-voice": [
    { key: "voiceSample", label: "上传你的声音样本（选填，用于音色克隆）", type: "file", accept: "audio/*" },
    { key: "voice", label: "音色", type: "select", options: ["温暖女声", "活力女声", "低沉男声", "温暖男声"], defaultValue: "温暖女声" },
    { key: "speed", label: "语速", type: "number", placeholder: "正常为 1.0", defaultValue: 1.0 }
  ],
  "subtitle-generator": [
    { key: "audioFile", label: "上传音视频文件", type: "file", accept: "audio/*,video/*" },
    { key: "sourceLanguage", label: "文件语言", type: "select", options: ["中文", "英文", "日文", "韩文"], defaultValue: "中文" },
    { key: "targetLanguage", label: "翻译目标语言", type: "select", options: ["不翻译", "中文", "英文", "日文", "韩文"], defaultValue: "不翻译" },
    { key: "format", label: "字幕格式", type: "select", options: ["SRT", "VTT", "纯文本"], defaultValue: "SRT" }
  ],
  "video-factory": [
    { key: "bgmStyle", label: "背景音乐", type: "select", options: ["轻快", "平静", "激昂", "励志", "无 BGM"], defaultValue: "轻快" },
    { key: "subtitleStyle", label: "字幕样式", type: "select", options: ["粗体", "简约", "卡拉OK", "无字幕"], defaultValue: "粗体" },
    { key: "aspectRatio", label: "画面比例", type: "select", options: ["9:16（竖屏）", "16:9（横屏）", "1:1（方形）"], defaultValue: "9:16（竖屏）" }
  ],
  "video-enhancer": [
    { key: "videoFile", label: "上传视频文件", type: "file", accept: "video/*" },
    { key: "enhanceLevel", label: "增强强度", type: "select", options: ["轻度", "中度", "深度"], defaultValue: "中度" }
  ],
  "multi-platform-publish": [
    { key: "videoFile", label: "上传视频文件", type: "file", accept: "video/*" },
    { key: "platforms", label: "发布平台（多个用逗号分隔）", type: "text", placeholder: "抖音,小红书,B站", defaultValue: "抖音" },
    { key: "scheduledAt", label: "定时发布时间", type: "text", placeholder: "留空立刻发布，如：2026-07-20 08:00", defaultValue: "" }
  ]
};
