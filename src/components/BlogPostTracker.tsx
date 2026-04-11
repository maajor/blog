"use client";

import { useEffect } from "react";
import { trackBlogPostView } from "@/lib/analytics";

export function BlogPostTracker({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    trackBlogPostView(slug, title);
  }, [slug, title]);
  return null;
}
