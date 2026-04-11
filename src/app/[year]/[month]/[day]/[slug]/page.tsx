import { getAllPosts } from "@/lib/posts";
import { redirect } from "next/navigation";

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts
    .filter((post) => post.date)
    .map((post) => {
      const d = new Date(post.date);
      const year = String(d.getFullYear());
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return { year, month, day, slug: post.slug };
    });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: "Redirecting...",
    refresh: { httpEquiv: "refresh", content: `0;url=/blog/${slug}` },
  };
}

export default async function LegacyPostRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/blog/${slug}`);
}
