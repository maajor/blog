import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { I18nProvider } from "@/lib/i18n";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebsiteJsonLd, PersonJsonLd } from "@/components/JsonLd";

const siteUrl = "https://ma-yidong.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "码工图形",
    template: "%s | 码工图形",
  },
  description:
    "Technical blog on computer graphics, game development, and AI-era engineering by Ma Yidong.",
  keywords: [
    "computer graphics",
    "game development",
    "AI",
    "graphics programming",
    "game engine",
    "Houdini",
    "Unity",
    "Unreal Engine",
    "machine learning",
    "real-time rendering",
    "procedural generation",
    "physics simulation",
  ],
  authors: [{ name: "Ma Yidong", url: siteUrl }],
  creator: "Ma Yidong",
  publisher: "Ma Yidong",
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "码工图形",
    title: "码工图形",
    description:
      "Technical blog on computer graphics, game development, and AI-era engineering by Ma Yidong.",
  },
  twitter: {
    card: "summary_large_image",
    title: "码工图形",
    description:
      "Technical blog on computer graphics, game development, and AI-era engineering by Ma Yidong.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)]">
        <WebsiteJsonLd />
        <PersonJsonLd />
        <GoogleAnalytics />
        <I18nProvider>
          <Header />
          <main className="flex-1 pt-14">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
