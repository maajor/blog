"use client";

import { useI18n } from "@/lib/i18n";

interface Post {
  slug: string;
  title: string;
  abstract?: string;
}

interface AboutContentProps {
  posts: Post[];
}

export default function AboutContent({ posts }: AboutContentProps) {
  const { lang, t } = useI18n();
  const isEn = lang === "en";

  return (
    <div className="max-w-[640px] mx-auto px-4 py-12">
      {/* Hero thesis */}
      <h1
        className="text-2xl md:text-3xl font-normal text-[var(--text)] mb-12 leading-snug"
        style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
      >
        {isEn
          ? "When AI writes the code, what makes an engineer valuable is knowing what to build — eight years in real-time graphics taught me that."
          : "AI 能写代码了，工程师的价值还剩什么——八年图形学经验给的答案是：知道该做什么。"}
      </h1>

      {/* Narrative bio */}
      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        {isEn ? (
          <>
            <p>
              I started at NetEase, deep in engine work — terrain authoring tool,
              vegetation systems, streaming for an open-world action game. The fun
              kind of problem: how do you draw ten thousand blades of grass on
              mobile without melting the GPU? Then I moved to Ubisoft Shanghai as a
              Technical Artist, working on several AAA titles. Same industry,
              different universe. A thousand people shipping one game. My day job
              was DCC pipeline tools — 3ds Max scripts, Python, C# — but the real
              education was watching how a studio that size coordinates: the
              pipeline IS the organization. Every bottleneck is a people problem
              wearing a technical hat. I&apos;d been writing about graphics and game
              tech since before I joined the industry, and kept at it through the
              years — 60+ articles now, covering rendering, tooling, and
              increasingly where AI fits into game development.
            </p>
            <p>
              In 2021 I joined Taichi Graphics (太极图形, later rebranded to Meshy.ai) as a Staff Engineer and
              built{" "}
              <a
                href="https://taitopia.design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Taitopia Renderer
              </a>{" "}
              from the ground up — an online rendering platform with art asset
              pipeline and front-end editor. React, Blender Python, the works. That
              project changed how I think about software: I went from writing tools
              inside game studios to building and shipping a product end-to-end.
              Different pressure — your users aren&apos;t your teammates anymore,
              they&apos;re strangers who leave when something breaks. The real lesson
              wasn&apos;t technical — it was product: start from a specific user and
              a real need, validate fast before you optimize process, and remember
              that lower onboarding friction doesn&apos;t create demand.
            </p>
            <p>
              I went independent in 2024. Contract work, consulting, and
              collaborating projects — mainly{" "}
              <a
                href="https://www.meta.com/experiences/voxel-playground/9926748747373800/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Voxel Playground
              </a>
              , a voxel sandbox on Meta Quest. AI coding tools have become part of
              my daily workflow across everything I build — the AI writes the first
              draft, I review and refine, the cycle repeats. It works. But the
              question I keep coming back to: when the tedious parts of engineering
              are fully automated, what&apos;s left? I think it&apos;s taste,
              judgment, and knowing which problems are worth solving.
            </p>
          </>
        ) : (
          <>
            <p>
              笔者从网易入行，做技术美术/引擎开发——地形编辑工具、植被系统、开放世界动作游戏的流式加载。之后去了育碧上海做技术美术，参与了几款
              3A
              项目。同一行业，完全不同的世界——上千人一起做一款游戏。日常工作是
              DCC
              管线工具，3ds Max
              脚本、Python、C#，但真正的收获是观察那样体量的团队怎么协作：管线就是组织架构，每个瓶颈本质上都是人的问题，只是戴着技术的帽子。笔者从入行前就开始写图形学和游戏技术的博客，这些年也没停过——现在有
              60 多篇，覆盖渲染、工具链，以及越来越多的 AI 在游戏开发中的应用。
            </p>
            <p>
              2021 年加入太极图形（Taichi
              Graphics，后改名为 Meshy.ai），从零搭建{" "}
              <a
                href="https://taitopia.design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Taitopia Renderer
              </a>
              ——一个在线渲染平台，负责美术资产管线和前端编辑器。React、Blender
              Python，什么都写。这个项目改变了笔者对软件的理解：从游戏工作室内部写工具，变成端到端做产品。压力不一样了——用户不是队友，是出了问题就走的陌生人。回头看，
              真正的教训其实不是技术，而是产品与需求：从目标用户和真实痛点出发，先快速验证再谈流程；上手门槛的降低只影响传播效率，不等于产品价值。
            </p>
            <p>
              2024 年开始独立工作。接外包、做咨询、合作开发——主要是{" "}
              <a
                href="https://www.meta.com/experiences/voxel-playground/9926748747373800/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Voxel Playground
              </a>
              ，Meta Quest
              上的体素沙盒。AI
              编程工具现在是日常标配了——AI
              写初稿，笔者审查和调整，循环往复。效果确实不错。但笔者一直在想一个问题：工程里繁琐的部分被自动化之后，还剩什么？想来想去，大概是品味、判断力，以及知道哪些问题值得解决。
            </p>
          </>
        )}
      </div>

      {/* Work */}
      <div className="mt-12 border-t border-[var(--border-light)] pt-8">
        <h2
          className="text-xl font-semibold text-[var(--text)] mb-4"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {t("about.work")}
        </h2>
        <div>
          {[
              {
                name: "Voxel Playground",
                desc: t("project.voxel"),
                href: "https://www.meta.com/experiences/voxel-playground/9926748747373800/",
              },
              {
                name: "Game Credits",
                desc: t("project.credits"),
                href: "https://www.mobygames.com/person/980549/ma-yi-dong/",
              },
              {
                name: "Wind Tunnel Simulator Demo",
                desc: t("project.windtunnel"),
                href: "https://store.steampowered.com/app/3846000/Wind_Tunnel_Simulator_Demo",
              },
            ].map((project, i) => (
            <div key={project.name} className={i > 0 ? "mt-3" : ""}>
              <span className="font-semibold text-[var(--text)]">
                {project.name}
              </span>
              <span className="text-[var(--text-secondary)]">
                {" "}
                — {project.desc}
              </span>
              <a
                href={project.href}
                className="text-[var(--accent)] hover:underline ml-1"
              >
                →
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Writing */}
      {posts.length > 0 && (
        <div className="mt-12 border-t border-[var(--border-light)] pt-8">
          <h2
            className="text-xl font-semibold text-[var(--text)] mb-4"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            {t("about.writing")}
          </h2>
          <div>
            {posts.map((post, i) => (
              <div key={post.slug} className={i > 0 ? "mt-3" : ""}>
                <a
                  href={`/blog/${post.slug}`}
                  className="text-[var(--accent)] hover:underline"
                >
                  {post.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="mt-12 border-t border-[var(--border-light)] pt-6">
        <p className="text-sm text-[var(--text-tertiary)]">
          <a
            href="https://github.com/maajor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline py-1"
          >
            GitHub
          </a>
          <span className="mx-2">·</span>
          <a
            href="/rss.xml"
            className="text-[var(--accent)] hover:underline py-1"
          >
            RSS
          </a>
        </p>
      </div>
    </div>
  );
}
