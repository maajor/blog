"use client";

import type { GameState } from "./types";
import { formatTime } from "./types";
import { TOTAL_LAPS } from "./constants";
import { Minimap } from "./Minimap";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const HUD_PANEL = "bg-[rgba(17,17,16,0.7)] backdrop-blur-sm rounded-md border border-[rgba(255,255,255,0.08)]";
const HUD_LABEL = "text-[rgba(255,255,255,0.4)]";
const HUD_VALUE = "text-[#e8e6e1]";
const HUD_MUTED = "text-[rgba(255,255,255,0.5)]";

export function HUD({
  speed,
  lapCount,
  raceComplete,
  raceStarted,
  currentLapTime,
  lapTimes,
  bestLapTime,
  totalTime,
  carT,
  heading,
  offTrack,
  wrongDirection,
  onRestart,
}: GameState & {
  onRestart: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      {/* Speed */}
      <div className={`absolute bottom-4 right-4 ${HUD_PANEL} px-4 py-2`}>
        <div className={`text-xs ${HUD_LABEL} font-mono uppercase tracking-wider`}>{t("game.speed")}</div>
        <div className={`text-2xl ${HUD_VALUE} font-mono tabular-nums`}>
          {Math.round(speed)}{" "}
          <span className={`text-sm ${HUD_MUTED}`}>{t("game.kmh")}</span>
        </div>
      </div>

      {/* Lap + Timer */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 ${HUD_PANEL} px-6 py-2 text-center`}>
        <div className={`text-xs ${HUD_LABEL} font-mono uppercase tracking-wider`}>
          {t("game.lap")} {Math.min(lapCount + 1, TOTAL_LAPS)} / {TOTAL_LAPS}
        </div>
        <div className={`text-2xl ${HUD_VALUE} font-mono tabular-nums`}>
          {raceStarted && !raceComplete
            ? formatTime(currentLapTime)
            : "0:00.00"}
        </div>
        {bestLapTime > 0 && (
          <div className="text-xs text-[#c87340] opacity-80">
            {t("game.best")}: {formatTime(bestLapTime)}
          </div>
        )}
      </div>

      {/* Total time (top-left during race) */}
      {raceStarted && (
        <div className={`absolute top-4 left-4 ${HUD_PANEL} px-4 py-2`}>
          <div className={`text-xs ${HUD_LABEL} font-mono uppercase tracking-wider`}>
            {t("game.totalTime")}
          </div>
          <div className={`text-lg ${HUD_VALUE} font-mono tabular-nums`}>
            {formatTime(totalTime)}
          </div>
        </div>
      )}

      {/* Minimap */}
      <Minimap carT={carT} heading={heading} />

      {/* Off-track warning */}
      {offTrack && !raceComplete && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse">
          <div className="text-[#d45040] text-3xl font-bold tracking-widest">
            {t("game.offTrack")}
          </div>
        </div>
      )}

      {/* Wrong direction warning */}
      {wrongDirection && !offTrack && !raceComplete && raceStarted && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-pulse">
          <div className="text-[#d4a040] text-3xl font-bold tracking-widest">
            {t("game.wrongDirection")}
          </div>
        </div>
      )}

      {/* Race complete overlay */}
      {raceComplete && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-[rgba(17,17,16,0.85)] backdrop-blur-md rounded-lg px-8 py-6 border border-[rgba(255,255,255,0.08)] pointer-events-auto min-w-[320px]">
            <div className="text-3xl text-[#e8e6e1] font-bold mb-4 text-center" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              {t("game.raceComplete")}
            </div>
            <div className="space-y-2 mb-4 font-mono text-sm">
              {lapTimes.map((lt) => (
                <div
                  key={lt.lap}
                  className={`flex justify-between ${HUD_MUTED}`}
                >
                  <span>{t("game.lap")} {lt.lap}</span>
                  <span
                    className={
                      lt.time === bestLapTime
                        ? "text-[#c87340]"
                        : ""
                    }
                  >
                    {formatTime(lt.time)}
                    {lt.time === bestLapTime && ` (${t("game.best")})`}
                  </span>
                </div>
              ))}
              <div className="border-t border-[rgba(255,255,255,0.1)] pt-2 mt-2 flex justify-between text-[#e8e6e1] font-bold">
                <span>{t("game.total")}</span>
                <span>{formatTime(totalTime)}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onRestart}
                className="flex-1 px-4 py-2 bg-[rgba(184,97,42,0.1)] border border-[#b8612a] text-[#c87340] rounded-md hover:bg-[rgba(184,97,42,0.2)] transition-colors duration-150 cursor-pointer"
              >
                {t("game.raceAgain")}
              </button>
              <Link
                href="/blog"
                className="flex-1 text-center px-4 py-2 bg-[rgba(184,97,42,0.1)] border border-[#b8612a] text-[#c87340] rounded-md hover:bg-[rgba(184,97,42,0.2)] transition-colors duration-150"
              >
                {t("game.enterBlog")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
