"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";

function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
      <div className="text-center">
        <div className="text-2xl mb-2 text-[var(--text)]" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>{t("loading.title")}</div>
        <div className="text-[var(--text-tertiary)] text-sm">{t("loading.subtitle")}</div>
      </div>
    </div>
  );
}

const RacingGame = dynamic(() => import("@/components/racing"), {
  ssr: false,
  loading: LoadingState,
});

export default function Home() {
  return <RacingGame />;
}
