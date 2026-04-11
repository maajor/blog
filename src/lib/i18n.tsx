"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "zh";

type Translations = Record<string, string>;

const translations: Record<Lang, Translations> = {
  en: {
    "nav.home": "Home",
    "nav.blog": "Blog",
    "nav.about": "About",
    "blog.title": "Blog",
    "blog.all": "All",
    "blog.noPosts": "No posts found.",
    "blog.previous": "Previous",
    "blog.next": "Next",
    "toc.title": "Table of Contents",
    "loading.title": "Loading...",
    "loading.subtitle": "Preparing the track",
    "about.work": "Work",
    "about.writing": "Writing",
    "project.voxel": "Voxel sandbox on Meta Quest",
    "project.credits": "Far Cry 6, Assassin's Creed Valhalla and more",
    "project.windtunnel": "Real-time fluid dynamics playground",
    "game.speed": "Speed",
    "game.kmh": "km/h",
    "game.lap": "Lap",
    "game.best": "Best",
    "game.totalTime": "Total Time",
    "game.offTrack": "OFF TRACK",
    "game.wrongDirection": "WRONG WAY",
    "game.raceComplete": "Race Complete!",
    "game.total": "Total",
    "game.raceAgain": "Race Again",
    "game.enterBlog": "Enter Blog",
    "game.title": "Racing Game",
    "game.mobileMsg": "The racing game requires a desktop browser with keyboard input.",
    "game.goBlog": "Go to Blog",
    "game.controls": "WASD / Arrows to drive · R respawn · Enter restart",
  },
  zh: {
    "nav.home": "首页",
    "nav.blog": "博客",
    "nav.about": "关于",
    "blog.title": "博客",
    "blog.all": "全部",
    "blog.noPosts": "没有找到文章。",
    "blog.previous": "上一页",
    "blog.next": "下一页",
    "toc.title": "目录",
    "loading.title": "加载中...",
    "loading.subtitle": "赛道准备中",
    "about.work": "作品",
    "about.writing": "文章",
    "project.voxel": "Meta Quest 上的体素沙盒",
    "project.credits": "《孤岛惊魂6》《刺客信条：英灵殿》等",
    "project.windtunnel": "实时流体力学模拟",
    "game.speed": "速度",
    "game.kmh": "km/h",
    "game.lap": "圈",
    "game.best": "最快",
    "game.totalTime": "总用时",
    "game.offTrack": "偏离赛道",
    "game.wrongDirection": "逆行警告",
    "game.raceComplete": "比赛完成！",
    "game.total": "总计",
    "game.raceAgain": "再来一局",
    "game.enterBlog": "进入博客",
    "game.title": "赛车游戏",
    "game.mobileMsg": "赛车游戏需要桌面浏览器和键盘操作。",
    "game.goBlog": "进入博客",
    "game.controls": "WASD / 方向键驾驶 · R 回到赛道 · Enter 重新开始",
  },
};

const tagTranslations: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {
    Graphics: "图形学",
    Rendering: "渲染",
    Houdini: "Houdini",
    Technical: "技术",
    "Machine Learning": "机器学习",
    "Year Review": "年度总结",
    Personal: "个人",
    Physics: "物理",
    "Tech Review": "技术评论",
    Optimization: "优化",
    Performance: "性能",
    "Game Development": "游戏开发",
    Unity: "Unity",
    Animation: "动画",
    "Procedural Generation": "程序化生成",
    Terrain: "地形",
    Pipeline: "管线",
    AI: "AI",
    "Virtual Reality": "虚拟现实",
    Modelling: "建模",
    Research: "研究",
  },
};

export function translateTag(tag: string, lang: Lang): string {
  return tagTranslations[lang]?.[tag] ?? tag;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  tTag: (tag: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLanguage(): Lang {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved === "en" || saved === "zh") return saved;
  return detectLanguage();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lang", newLang);
  };

  const t = (key: string): string => translations[lang][key] ?? key;
  const tTag = (tag: string): string => translateTag(tag, lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tTag }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
