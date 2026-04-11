import fs from "fs";
import path from "path";
import { getAllPosts } from "./posts";

const siteUrl = "https://ma-yidong.com";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export function generateSitemap() {
  const entries: SitemapEntry[] = [];

  // Static pages
  entries.push(
    { loc: siteUrl, changefreq: "monthly", priority: 1.0 },
    { loc: `${siteUrl}/blog`, changefreq: "weekly", priority: 0.9 },
    { loc: `${siteUrl}/about`, changefreq: "monthly", priority: 0.7 }
  );

  // Blog posts
  const posts = getAllPosts();
  posts.forEach((post) => {
    entries.push({
      loc: `${siteUrl}/blog/${post.slug}`,
      lastmod: post.date ? new Date(post.date).toISOString().split("T")[0] : undefined,
      changefreq: "monthly",
      priority: 0.8,
    });
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ""}${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml);
  console.log(`Sitemap generated with ${entries.length} URLs`);
}
