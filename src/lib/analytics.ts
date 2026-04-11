declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackPageView(url: string) {
  if (!GA_ID) return;
  gtag("config", GA_ID, { page_path: url });
}

export function trackGameStart() {
  if (!GA_ID) return;
  gtag("event", "game_start");
}

export function trackLapComplete(lapNumber: number, lapTimeMs: number) {
  if (!GA_ID) return;
  gtag("event", "lap_complete", {
    lap_number: lapNumber,
    lap_time_ms: Math.round(lapTimeMs),
  });
}

export function trackRaceComplete(totalTimeMs: number, bestLapMs: number) {
  if (!GA_ID) return;
  gtag("event", "race_complete", {
    total_time_ms: Math.round(totalTimeMs),
    best_lap_ms: Math.round(bestLapMs),
  });
}

export function trackGameReset(lapsCompleted: number) {
  if (!GA_ID) return;
  gtag("event", "game_reset", {
    laps_completed: lapsCompleted,
  });
}

export function trackBlogPostView(slug: string, title: string) {
  if (!GA_ID) return;
  gtag("event", "blog_post_view", {
    post_slug: slug,
    post_title: title,
  });
}

export function trackBlogTagFilter(tagName: string) {
  if (!GA_ID) return;
  gtag("event", "blog_tag_filter", {
    tag_name: tagName,
  });
}
