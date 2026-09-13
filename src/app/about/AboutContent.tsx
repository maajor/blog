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
          ? "My years in big game studios taught me one thing: in mass markets, deep tech is just a cost line. Since 2024 I've been running the opposite experiment — a one-person studio making things where depth is the product."
          : "在游戏大厂的那些年，我只确认了一件事：大众市场里，深技术只是成本。2024 年起，我在跑一个相反的实验——一个人的工作室，只做“深度本身就是产品”的东西。"}
      </h1>

      {/* Narrative bio */}
      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        {isEn ? (
          <>
            <p>
              I started in 2016 at NetEase, doing engine work — a terrain
              authoring tool, vegetation systems, streaming for an open-world
              action game. The fun kind of problem: how do you draw ten thousand
              blades of grass on a mobile GPU without melting it?
            </p>
            <p>
              Then Ubisoft Shanghai, as a Technical Artist on AAA titles. Same
              industry, different universe: a thousand people shipping one game.
              My real education was watching how that machine coordinates — the
              pipeline is the organization, and most bottlenecks are people
              problems wearing technical hats. That&apos;s also where I learned
              what deep tech is worth in a mass market: nobody buys a game for
              its vegetation system — people only pay for what they can
              perceive. The depth was real; on the spreadsheet, it was overhead.
            </p>
            <p>
              In 2021 I joined Taichi Graphics (later rebranded to Meshy.ai) as
              a Staff Engineer and built{" "}
              <a
                href="https://taitopia.design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Taitopia Renderer
              </a>{" "}
              from the ground up — an online rendering platform with an art
              asset pipeline and a front-end editor. React, Blender Python, the
              works. It was the first product I owned end to end, and it
              rewired how I think about software: your users aren&apos;t
              teammates anymore, they&apos;re strangers who leave when something
              breaks. The lessons that stuck were product lessons, not technical
              ones — start from a specific user with a real need, and validate
              before you optimize anything.
            </p>
            <p>
              Since 2024 I&apos;ve been independent — contract work,
              consulting, and collaborations. Mostly that&apos;s been{" "}
              <a
                href="https://www.meta.com/experiences/voxel-playground/9926748747373800/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Voxel Playground
              </a>
              , a voxel sandbox on Meta Quest. In my own time I run experiments
              like Wind Tunnel Simulator, a real-time fluid dynamics playground.
              And I write this blog — sixty-odd articles on rendering, tooling,
              and game tech; it&apos;s also how people who care about this stuff
              find me.
            </p>
            <p>
              This experiment only became runnable now. What blocks a one-person
              product was never depth — it&apos;s breadth: frontend, backend,
              storefront, all the work that used to force a deep specialist into
              an organization. AI has collapsed that breadth tax. Markets too
              small to feed a team can now feed one person. And as AI floods the
              world with sixty-point software, the relative price of depth only
              goes up. AI is a multiplier; depth is the base. So the answer
              I&apos;m looking for: a market too small for any big company&apos;s
              cost structure to bother with, deep enough that the work stays
              interesting — and one product that can sustain a single person for
              years.
            </p>
          </>
        ) : (
          <>
            <p>
              2016 年入行，在网易做引擎开发——地形编辑工具、植被系统、开放世界动作游戏的流式加载。最好玩的那类问题：怎么在手机
              GPU 上画一万根草，还不把它烫化。
            </p>
            <p>
              之后去了育碧上海做技术美术，参与几款 3A
              项目。同一个行业，另一个宇宙：一千人做一款游戏。真正的收获是看清那台机器怎么协作——管线就是组织架构，多数瓶颈都是戴着技术帽子的人的问题。也是在那里，我看清了深技术在大众市场的价格：没有玩家会为一套植被系统买游戏——买家只付费给自己能感知的东西。深度是真的，在报表上，它是成本。
            </p>
            <p>
              2021 年加入太极图形（后更名为 Meshy.ai）任 Staff Engineer，从零搭建{" "}
              <a
                href="https://taitopia.design"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Taitopia Renderer
              </a>
              ——一个在线渲染平台，带美术资产管线和前端编辑器。React、Blender
              Python，什么都写。这是我第一次端到端拥有一个产品，它改写了我对软件的理解：用户不再是队友，而是出了问题就走的陌生人。留下来的教训都是产品的，不是技术的——从一个具体用户和真实需求出发，先验证，再谈优化。
            </p>
            <p>
              2024 年起独立工作——接外包、做咨询、合作项目。主要在做{" "}
              <a
                href="https://www.meta.com/experiences/voxel-playground/9926748747373800/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Voxel Playground
              </a>
              ，Meta Quest 上的体素沙盒。自己的时间做技术实验，比如
              Wind Tunnel Simulator，一个实时流体模拟
              playground。再加上写这个博客：六十多篇渲染、工具链和游戏技术的文章，也是同好找到我的方式。
            </p>
            <p>
              这个实验只有现在才跑得通。卡住一人产品的从来不是深度，是宽度——前端、后端、商店页，这些过去会逼着深度专家进组织。AI
              把宽度税打掉了；养不活团队的市场，现在养得活一个人；而当 AI 让 60
              分的软件无限供给，深度的相对价格只会更高。AI 是乘数，深度是底数。所以我在找的答案是：一个市场，小到大公司的成本结构进不来，深到事情本身足够有趣——然后做一个能养活一个人很多年的产品。
            </p>
          </>
        )}
      </div>

      {/* What I do */}
      <div className="mt-12 border-t border-[var(--border-light)] pt-8">
        <h2
          className="text-xl font-semibold text-[var(--text)] mb-4"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {t("about.services")}
        </h2>
        <div className="text-[var(--text-secondary)] leading-relaxed">
          {isEn ? (
            <p>
              Everything I build is real-time simulation — physics, rendering,
              and optimization are its internals. Plus one transformation:
              turning papers and algorithms into real-time, interactive
              versions.
            </p>
          ) : (
            <p>
              我做的都是实时模拟——物理、渲染、优化是它的内部构造；外加一种转化：把论文和算法变成实时、可交互的版本。
            </p>
          )}
        </div>
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

      {/* Contact */}
      <div className="mt-12 border-t border-[var(--border-light)] pt-8">
        <h2
          className="text-xl font-semibold text-[var(--text)] mb-4"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {t("about.contact")}
        </h2>
        <div className="space-y-3 text-[var(--text-secondary)]">
          <p>{t("about.contact.wechat")}</p>
          <p>
            Email{" "}
            <a
              href="mailto:info@ma-yidong.com"
              className="text-[var(--accent)] hover:underline"
            >
              info@ma-yidong.com
            </a>
          </p>
          <p>
            <a
              href="https://www.linkedin.com/in/mayidong/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              LinkedIn
            </a>
          </p>
        </div>
      </div>

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
