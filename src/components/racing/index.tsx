"use client";

import { useRef, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import type { WebGLRenderer } from "three";
import type { GameState } from "./types";
import { GameScene } from "./GameScene";
import { HUD } from "./HUD";
import { TouchControls } from "./TouchControls";
import type { Controls } from "./use-controls";
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
  const [gs, setGs] = useState<GameState>(INITIAL_STATE);
  const vehicleRef = useRef<VehicleRef>(null);
  const controls = useRef<Controls>({
    forward: false,
    left: false,
    right: false,
    brake: false,
  });
  const [resetSignal, setResetSignal] = useState(0);
  const [respawnSignal, setRespawnSignal] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const onStateChange = useCallback((s: GameState) => setGs(s), []);
  const { t } = useI18n();

  const handleCreated = useCallback(
    ({ gl }: { gl: WebGLRenderer }) => {
      const canvas = gl.domElement;
      canvas.addEventListener(
        "webglcontextlost",
        () => {
          setContextLost(true);
        },
        { once: true }
      );
      canvas.addEventListener("webglcontextrestored", () => {
        setContextLost(false);
      });
    },
    []
  );

  const handleRestart = useCallback(() => {
    setResetSignal((prev) => prev + 1);
    setGs(INITIAL_STATE);
  }, []);

  const handleRespawn = useCallback(() => {
    setRespawnSignal((prev) => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] touch-none">
      <Canvas
        camera={{ fov: 65, near: 0.1, far: 2000, position: [0, 4, -10] }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={handleCreated}
        style={{ background: "#c8bfad" }}
      >
        <GameScene
          vehicleRef={vehicleRef}
          onStateChange={onStateChange}
          resetSignal={resetSignal}
          controls={controls}
          respawnSignal={respawnSignal}
        />
      </Canvas>
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(17,17,16,0.7)]">
          <div className="text-center">
            <div
              className="text-xl text-[#e8e6e1] mb-3"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              WebGL Context Lost
            </div>
            <button
              onClick={() => {
                setContextLost(false);
                setResetSignal((prev) => prev + 1);
              }}
              className="px-6 py-2 bg-[rgba(184,97,42,0.1)] border border-[#b8612a] text-[#c87340] rounded-md cursor-pointer"
            >
              Reload
            </button>
          </div>
        </div>
      )}
      <HUD {...gs} onRestart={handleRestart} />
      <TouchControls controls={controls} onRespawn={handleRespawn} />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-[rgba(26,25,24,0.5)] font-mono tracking-wide hidden md:block">
        {t("game.controls")}
      </div>
    </div>
  );
}
