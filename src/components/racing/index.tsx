"use client";

import { useRef, useEffect, useState, useCallback, memo } from "react";
import { Canvas } from "@react-three/fiber";
import type { GameState } from "./types";
import { GameScene } from "./GameScene";
import { HUD } from "./HUD";
import type { VehicleRef } from "./Car";
import { useI18n } from "@/lib/i18n";

const INITIAL_STATE: GameState = {
  speed: 0,
  lapCount: 0,
  raceComplete: false,
  raceStarted: false,
  currentLapTime: 0,
  lapTimes: [],
  bestLapTime: 0,
  totalTime: 0,
  carT: 0,
  heading: 0,
  offTrack: false,
  wrongDirection: false,
};

export default function RacingGame() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [gs, setGs] = useState<GameState>(INITIAL_STATE);
  const vehicleRef = useRef<VehicleRef>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const onStateChange = useCallback((s: GameState) => setGs(s), []);
  const { t } = useI18n();

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleRestart = useCallback(() => {
    setResetSignal((prev) => prev + 1);
    setGs(INITIAL_STATE);
  }, []);

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h2 className="text-2xl text-[var(--text)] mb-4" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
          {t("game.title")}
        </h2>
        <p className="text-[var(--text-secondary)] mb-6">
          {t("game.mobileMsg")}
        </p>
        <a
          href="/blog"
          className="px-6 py-3 bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent)] rounded-md hover:bg-[var(--accent)]/15 transition-colors duration-150"
        >
          {t("game.goBlog")}
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)]">
      <Canvas
        camera={{ fov: 65, near: 0.1, far: 2000, position: [0, 4, -10] }}
        gl={{
          antialias: true,
          alpha: false,
        }}
        style={{ background: "#c8bfad" }}
      >
        <GameScene
          vehicleRef={vehicleRef}
          onStateChange={onStateChange}
          resetSignal={resetSignal}
        />
      </Canvas>
      <HUD {...gs} onRestart={handleRestart} />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-[rgba(26,25,24,0.5)] font-mono tracking-wide">
        {t("game.controls")}
      </div>
    </div>
  );
}
