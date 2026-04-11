import { getAllPosts } from "@/lib/posts";
import AboutContent from "./AboutContent";

export const metadata = {
  title: "About",
  description:
    "Eight years building real-time graphics and game technology. Now exploring what makes engineers irreplaceable when AI writes the code.",
  openGraph: {
    title: "About | 码工图形",
    description:
      "Eight years building real-time graphics and game technology. Now exploring what makes engineers irreplaceable when AI writes the code.",
  },
  twitter: {
    card: "summary" as const,
    title: "About | 码工图形",
    description:
      "Eight years building real-time graphics and game technology. Now exploring what makes engineers irreplaceable when AI writes the code.",
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
