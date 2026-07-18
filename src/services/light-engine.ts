/**
 * 轻量规则引擎 — 在 AI 模型加载期间快速出结果
 * 不需要任何下载，纯 JS 即时响应
 */

const SYNONYMS: Record<string, string[]> = {
  "很棒": ["非常好", "优秀", "出色", "厉害", "不错"],
  "喜欢": ["偏爱", "钟意", "欣赏", "喜爱", "中意"],
  "好看": ["美观", "漂亮", "精致", "赏心悦目", "高颜值"],
  "便宜": ["实惠", "划算", "性价比高", "不贵", "亲民价格"],
  "简单": ["容易上手", "轻松", "不复杂", "入门简单", "即学即用"],
  "好用": ["实用", "顺手", "方便", "便捷", "使用体验好"],
  "快来": ["赶紧", "立刻", "马上", "速来", "抓紧"],
  "一定": ["必须", "绝对", "肯定", "务必", "千万"],
  "因为": ["由于", "因为...所以", "之所以", "源于", "起因于"],
  "所以": ["因此", "因而", "于是", "故", "由此可见"],
  "应该": ["需要", "应当", "必须", "理应", "该"],
  "想要": ["希望", "渴望", "期待", "盼望", "向往"],
};

const PATTERNS = [
  { from: /非常(.{1,8})的/g, to: "$1得" },
  { from: /特别(.{1,8})的/g, to: "$1得" },
  { from: /真的很(.{1,8})/g, to: "真的$1" },
  { from: /一般来说/g, to: "一般来说," },
  { from: /但是/g, to: "但" },
];

const OPENINGS = [
  "说实话，", "你发现没，", "讲真的，", "不夸张地说，",
  "这个是真的，", "姐妹们，", "兄弟们，", "真的，",
];

const CLOSINGS = [
  "赶紧试试吧！", "你学会了吗？", "收藏起来慢慢看。",
  "转发给需要的人。", "评论区告诉我你怎么看。", "点个关注不迷路。",
];

function randomPick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 快速改写 — 基于规则，秒出结果 */
export function quickRewrite(content: string, style: string): string {
  let result = content;

  // 同义词替换
  for (const [word, syns] of Object.entries(SYNONYMS)) {
    if (result.includes(word)) {
      result = result.replace(new RegExp(word, "g"), randomPick(syns));
    }
  }

  // 句式变换
  for (const { from, to } of PATTERNS) {
    result = result.replace(from, to);
  }

  // 口语化风格: 加开头和结尾
  if (style === "口语化" || style === "营销风") {
    if (!result.startsWith("你") && !result.startsWith("这") && !result.startsWith("我")) {
      result = randomPick(OPENINGS) + result;
    }
    result = result + "\n\n" + randomPick(CLOSINGS);
  }

  // 长句拆短
  result = result.replace(/，([^，]{15,})/g, (_, m) => "。" + m);

  return result;
}

/** 快速脚本生成 */
export function quickScript(topic: string): string {
  const script = [
    `【${topic.trim()}】`,
    "",
    randomPick(OPENINGS) + "今天聊一个话题——" + topic.trim() + "。",
    "",
    "先说结论：这个领域的机会比你想的大得多。",
    "",
    "第一点，门槛极低。不需要经验，不需要资源，一部手机就能开始。",
    "",
    "第二点，效果立竿见影。做完立刻能看到结果，正反馈来得很快。",
    "",
    "第三点，竞争对手不多。大部分人还没意识到这个机会，你先做你就领先。",
    "",
    "具体怎么做？三个步骤：",
    "1. 先模仿，找到对标账号，拆解他们的内容逻辑",
    "2. 再创新，在模仿的基础上加入自己的特色",
    "3. 最后优化，根据数据反馈不断调整方向",
    "",
    randomPick(CLOSINGS),
  ];
  return script.join("\n");
}

/** 快速分享文案 */
export function quickSocialCopy(title: string, platforms: string): string {
  const tags = title.replace(/[，,。.！!？?]/g, " ").split(" ").filter(Boolean);
  const hashtagStr = tags.map(t => "#" + t).join(" ");

  const results: string[] = [];
  for (const p of platforms.split(",")) {
    const platform = p.trim();
    results.push(`【${platform}】`);
    results.push(`${title}`);
    results.push("");
    results.push(hashtagStr);
    results.push("");
  }

  return results.join("\n");
}
