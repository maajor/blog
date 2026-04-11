"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function TagBadge({ tag }: { tag: string }) {
  const { tTag } = useI18n();
  return (
    <Link
      href={`/blog?tag=${encodeURIComponent(tag)}`}
      className="px-2 py-0.5 rounded text-xs border border-[var(--border-light)] text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors duration-150"
    >
      {tTag(tag)}
    </Link>
  );
}
