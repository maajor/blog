interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const siteUrl = "https://ma-yidong.com";

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "码工图形",
        alternateName: "ma-yidong.com",
        url: siteUrl,
        description:
          "Technical blog on computer graphics, game development, and AI-era engineering by Ma Yidong.",
        inLanguage: "en",
        author: {
          "@type": "Person",
          name: "Ma Yidong",
          url: siteUrl,
        },
      }}
    />
  );
}

export function PersonJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Ma Yidong",
        url: siteUrl,
        sameAs: [
          "https://github.com/maajor",
          "https://www.artstation.com/maajor",
        ],
        knowsAbout: [
          "Computer Graphics",
          "Game Development",
          "Real-time Rendering",
          "Procedural Generation",
          "Physics Simulation",
          "AI Engineering",
        ],
        jobTitle: "Graphics & Game Engineer",
      }}
    />
  );
}

export function BlogPostJsonLd({
  title,
  description,
  date,
  slug,
}: {
  title: string;
  description: string;
  date: string;
  slug: string;
}) {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: description,
          url: `${siteUrl}/blog/${slug}`,
          datePublished: date,
          author: {
            "@type": "Person",
            name: "Ma Yidong",
            url: siteUrl,
          },
          publisher: {
            "@type": "Person",
            name: "Ma Yidong",
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${siteUrl}/blog/${slug}`,
          },
          inLanguage: "en",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Blog",
              item: `${siteUrl}/blog`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: title,
              item: `${siteUrl}/blog/${slug}`,
            },
          ],
        }}
      />
    </>
  );
}
