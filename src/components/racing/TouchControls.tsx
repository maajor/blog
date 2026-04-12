"use client";

import { useCallback, useSyncExternalStore, useRef } from "react";
import type { Controls } from "./use-controls";

interface TouchControlsProps {
  controls: React.RefObject<Controls>;
  onRespawn: () => void;
}

const DEAD_ZONE = 0.2;

function SteerSlider({
  controls,
}: {
  controls: React.RefObject<Controls>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const knobXRef = useRef(0);
  const trackWidth = 160;
  const knobWidth = 44;
  const maxDist = (trackWidth - knobWidth) / 2;

  const updateSteering = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      let dx = clientX - cx;
      dx = Math.max(-maxDist, Math.min(maxDist, dx));
      knobXRef.current = dx;
      const n = dx / maxDist;
      controls.current.left = n < -DEAD_ZONE;
      controls.current.right = n > DEAD_ZONE;
    },
    [controls, maxDist],
  );

  const release = useCallback(() => {
    pointerId.current = null;
    knobXRef.current = 0;
    controls.current.left = false;
    controls.current.right = false;
  }, [controls]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      pointerId.current = e.pointerId;
      updateSteering(e.clientX);
    },
    [updateSteering],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      updateSteering(e.clientX);
    },
    [updateSteering],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      release();
    },
    [release],
  );

  const knobXValue = knobXRef.current;

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="touch-none select-none relative rounded-full bg-[rgba(17,17,16,0.3)] border border-[rgba(255,255,255,0.1)] pointer-events-auto"
      style={{ width: trackWidth, height: knobWidth }}
    >
      {/* Center line */}
      <div className="absolute left-1/2 top-1 w-[1px] h-[calc(100%-8px)] bg-[rgba(255,255,255,0.06)] -translate-x-1/2" />
      {/* Knob */}
      <div
        className="absolute top-0 rounded-full bg-[rgba(255,255,255,0.18)] border border-[rgba(255,255,255,0.12)]"
        style={{
          width: knobWidth,
          height: knobWidth,
          left: trackWidth / 2 - knobWidth / 2 + knobXValue,
          willChange: "transform",
        }}
      />
    </div>
  );
}

function ActionButton({
  label,
  controlKey,
  controls,
  className = "",
}: {
  label: string;
  controlKey: keyof Controls;
  controls: React.RefObject<Controls>;
  className?: string;
}) {
  const pressed = useCallback(() => {
    controls.current[controlKey] = true;
  }, [controls, controlKey]);
  const released = useCallback(() => {
    controls.current[controlKey] = false;
  }, [controls, controlKey]);

  return (
    <div
      onPointerDown={pressed}
      onPointerUp={released}
      onPointerCancel={released}
      onPointerLeave={released}
      className={`touch-none select-none bg-[rgba(17,17,16,0.4)] backdrop-blur-sm rounded-xl border border-[rgba(255,255,255,0.08)] active:bg-[rgba(184,97,42,0.3)] active:border-[rgba(184,97,42,0.3)] transition-colors duration-75 flex items-center justify-center pointer-events-auto ${className}`}
    >
      {label}
    </div>
  );
}

function useHasTouch() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = matchMedia("(pointer: coarse)");
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => "ontouchstart" in window || navigator.maxTouchPoints > 0,
    () => false,
  );
}

export function TouchControls({ controls, onRespawn }: TouchControlsProps) {
  const show = useHasTouch();

  if (!show) return null;

  return (
    <>
      {/* Respawn */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          onRespawn();
        }}
        className="absolute top-12 right-4 touch-none select-none bg-[rgba(17,17,16,0.4)] backdrop-blur-sm rounded-xl border border-[rgba(255,255,255,0.08)] active:bg-[rgba(184,97,42,0.3)] active:border-[rgba(184,97,42,0.3)] transition-colors duration-75 flex items-center justify-center pointer-events-auto w-10 h-10 text-[rgba(255,255,255,0.4)] text-lg cursor-pointer"
      >
        ↺
      </button>

      {/* Steering slider — bottom left */}
      <div className="absolute bottom-8 left-4">
        <SteerSlider controls={controls} />
      </div>

      {/* Gas & Brake buttons — bottom right */}
      <div className="absolute bottom-8 right-4 flex flex-col gap-2">
        <ActionButton
          label="GAS"
          controlKey="forward"
          controls={controls}
          className="w-[5rem] h-[5rem] text-[rgba(255,255,255,0.4)] text-xs font-mono uppercase tracking-wider"
        />
        <ActionButton
          label="BRK"
          controlKey="brake"
          controls={controls}
          className="w-12 h-12 text-[rgba(255,255,255,0.4)] text-xs font-mono self-center"
        />
      </div>
    </>
  );
}
