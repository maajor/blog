import RSS from "rss";
import fs from "fs";
import path from "path";
import { getAllPosts } from "./posts";

export async function generateRSS() {
  const siteUrl = "https://ma-yidong.com";
  const feed = new RSS({
    title: "码工图形",
    description:
      "Technical blog on computer graphics, game development, and AI-era engineering by Ma Yidong.",
    feed_url: `${siteUrl}/rss.xml`,
    site_url: siteUrl,
    language: "en",
  });

  const posts = getAllPosts();
  posts.forEach((post) => {
    feed.item({
      title: post.title,
      description: post.abstract,
      url: `${siteUrl}/blog/${post.slug}`,
      date: post.date,
    });
  });

  const xml = feed.xml();
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, "rss.xml"), xml);
}
