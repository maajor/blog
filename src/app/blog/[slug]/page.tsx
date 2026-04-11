import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { markdownToHtml, extractHeadings } from "@/lib/markdown";
import Link from "next/link";
import TableOfContents from "@/components/TableOfContents";
import GiscusComments from "@/components/GiscusComments";
import TagBadge from "@/components/TagBadge";
import { notFound } from "next/navigation";
import { BlogPostTracker } from "@/components/BlogPostTracker";
import { BlogPostJsonLd } from "@/components/JsonLd";

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: post.title,
    description: post.abstract,
    openGraph: {
      title: post.title,
      description: post.abstract,
      type: "article" as const,
      publishedTime: post.date,
      authors: ["Ma Yidong"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description: post.abstract,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const content = await markdownToHtml(post.content);
  const headings = extractHeadings(post.content);

  // Get prev/next posts
  const allPosts = getAllPosts();
  const currentIndex = allPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;

  return (
    <div className="max-w-[960px] mx-auto px-4 py-12">
      <BlogPostJsonLd title={post.title} description={post.abstract} date={post.date} slug={slug} />
      <BlogPostTracker slug={slug} title={post.title} />
      <div className="flex gap-12">
        {/* Main content */}
        <article className="flex-1 min-w-0">
          <header className="mb-8">
            <h1 className="text-3xl font-semibold text-[var(--text)] mb-3" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[var(--text-tertiary)]">
              <time>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <div className="flex gap-2">
                {post.tags.map((tag) => (
                  <TagBadge key={tag} tag={tag} />
                ))}
              </div>
            </div>
          </header>

          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Prev / Next navigation */}
          <nav className="mt-12 pt-6 border-t border-[var(--border-light)] flex justify-between">
            {prevPost ? (
              <Link
                href={`/blog/${prevPost.slug}`}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150"
              >
                &larr; {prevPost.title}
              </Link>
            ) : <div />}
            {nextPost ? (
              <Link
                href={`/blog/${nextPost.slug}`}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150"
              >
                {nextPost.title} &rarr;
              </Link>
            ) : <div />}
          </nav>

          {/* Comments */}
          <div className="mt-12">
            <GiscusComments />
          </div>
        </article>

        {/* Sidebar: TOC */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <TableOfContents headings={headings} />
          </div>
        </aside>
      </div>
    </div>
  );
}
