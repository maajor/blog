"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { trackBlogTagFilter } from "@/lib/analytics";

const POSTS_PER_PAGE = 10;

interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  abstract: string;
}

export default function BlogList({ posts, allTags }: { posts: Post[]; allTags: string[] }) {
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");
  const page = Number(searchParams.get("page") || "1");
  const { lang, t, tTag } = useI18n();

  const dateLocale = lang === "zh" ? "zh-CN" : "en-US";

  const filteredPosts = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.includes(activeTag));
  }, [posts, activeTag]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (activeTag) params.set("tag", activeTag);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-[var(--text)] mb-8" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
        {t("blog.title")}
      </h1>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/blog"
          onClick={() => trackBlogTagFilter("all")}
          className={`px-3 py-1 rounded-full text-xs border transition-colors duration-150 ${
            !activeTag
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5"
              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {t("blog.all")}
        </Link>
        {allTags.map((tag) => (
          <Link
            key={tag}
            href={`/blog?tag=${encodeURIComponent(tag)}`}
            onClick={() => trackBlogTagFilter(tag)}
            className={`px-3 py-1 rounded-full text-xs border transition-colors duration-150 ${
              activeTag === tag
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {tTag(tag)}
          </Link>
        ))}
      </div>

      {/* Posts list */}
      <div className="space-y-6">
        {paginatedPosts.map((post) => (
          <article key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block p-6 rounded-md border border-[var(--border-light)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border)] transition-colors duration-150"
            >
              <h2 className="text-xl font-semibold text-[var(--text)] mb-2" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
                {post.title}
              </h2>
              <time className="text-xs text-[var(--text-tertiary)]">
                {new Date(post.date).toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.abstract && (
                <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {post.abstract}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs border border-[var(--border-light)] text-[var(--text-tertiary)]"
                  >
                    {tTag(tag)}
                  </span>
                ))}
              </div>
            </Link>
          </article>
        ))}
        {filteredPosts.length === 0 && (
          <p className="text-[var(--text-tertiary)] text-center py-12">
            {t("blog.noPosts")}
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          {currentPage > 1 ? (
            <Link
              href={pageUrl(currentPage - 1)}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              {t("blog.previous")}
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm border border-[var(--border-light)] rounded-md text-[var(--text-tertiary)] cursor-default">
              {t("blog.previous")}
            </span>
          )}
          <span className="text-sm text-[var(--text-secondary)]">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link
              href={pageUrl(currentPage + 1)}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150"
            >
              {t("blog.next")}
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm border border-[var(--border-light)] rounded-md text-[var(--text-tertiary)] cursor-default">
              {t("blog.next")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
