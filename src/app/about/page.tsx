import { getAllPosts } from "@/lib/posts";
import AboutContent from "./AboutContent";

export const metadata = {
  title: "About",
  description:
    "Deep tech is a cost in mass markets — years in big game studios taught me that. Now running the opposite experiment: a one-person studio making things where depth is the product.",
  openGraph: {
    title: "About | 码工图形",
    description:
      "Deep tech is a cost in mass markets — years in big game studios taught me that. Now running the opposite experiment: a one-person studio making things where depth is the product.",
  },
  twitter: {
    card: "summary" as const,
    title: "About | 码工图形",
    description:
      "Deep tech is a cost in mass markets — years in big game studios taught me that. Now running the opposite experiment: a one-person studio making things where depth is the product.",
  },
};

const featuredSlugs = [
  "realtime-physical-based-rendering-a-personal-outline",
  "20251123-game-destruction-physics-art",
  "20250730-ai-gaming-roadmap",
];

export default function AboutPage() {
  const allPosts = getAllPosts();
  const posts = allPosts.filter((p) => featuredSlugs.includes(p.slug));

  return <AboutContent posts={posts} />;
}
