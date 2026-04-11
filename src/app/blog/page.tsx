import { Suspense } from "react";
import { getAllPosts, getAllTags } from "@/lib/posts";
import BlogList from "@/components/TagFilter";

export const metadata = {
  title: "Blog",
  description:
    "Articles about computer graphics, game development, physics simulation, procedural generation, and AI-era engineering.",
  openGraph: {
    title: "Blog | 码工图形",
    description:
      "Articles about computer graphics, game development, physics simulation, procedural generation, and AI-era engineering.",
  },
  twitter: {
    card: "summary" as const,
    title: "Blog | 码工图形",
    description:
      "Articles about computer graphics, game development, physics simulation, procedural generation, and AI-era engineering.",
  },
};

export default function BlogPage() {
  const allPosts = getAllPosts();
  const allTags = getAllTags();

  return (
    <Suspense fallback={<BlogFallback />}>
      <BlogList posts={allPosts} allTags={allTags} />
    </Suspense>
  );
}

function BlogFallback() {
  return (
    <div className="max-w-[960px] mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-[var(--text)] mb-8" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>Blog</h1>
      <div className="text-[var(--text-tertiary)]">Loading posts...</div>
    </div>
  );
}
