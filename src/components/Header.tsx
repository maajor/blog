"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-light)] bg-[var(--bg)]/90 backdrop-blur-sm">
      <nav className="max-w-[960px] mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-wide text-[var(--text)]" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
          ma-yidong
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
            {t("nav.home")}
          </Link>
          <Link href="/blog" className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
            {t("nav.blog")}
          </Link>
          <Link href="/about" className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
            {t("nav.about")}
          </Link>
          <button
            onClick={toggleLang}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm cursor-pointer"
          >
            {lang === "en" ? "中文" : "EN"}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[var(--border-light)] bg-[var(--bg)]/95 backdrop-blur-sm">
          <div className="flex flex-col px-4 py-3 gap-3">
            <Link href="/" onClick={() => setMenuOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
              {t("nav.home")}
            </Link>
            <Link href="/blog" onClick={() => setMenuOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
              {t("nav.blog")}
            </Link>
            <Link href="/about" onClick={() => setMenuOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm">
              {t("nav.about")}
            </Link>
            <button
              onClick={() => { toggleLang(); setMenuOpen(false); }}
              className="text-left text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors duration-150 text-sm cursor-pointer"
            >
              {lang === "en" ? "中文" : "EN"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
