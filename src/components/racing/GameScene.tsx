"use client";

import { memo } from "react";
import { Physics } from "@react-three/rapier";
import type { GameState } from "./types";
import { Car, type VehicleRef } from "./Car";
import { Track } from "./Track";
import { Ground } from "./Ground";
import { Buildings } from "./Buildings";
import { Trees } from "./Trees";
import { SkyBackground } from "./SkyBackground";
import { ChaseCamera } from "./ChaseCamera";
import { GameLogic } from "./GameLogic";
import { TrackWalls } from "./TrackWalls";
import { RAPIER_UPDATE_PRIORITY } from "./constants";

export const GameScene = memo(function GameScene({
  vehicleRef,
  onStateChange,
  resetSignal,
}: {
  vehicleRef: React.RefObject<VehicleRef | null>;
  onStateChange: (s: GameState) => void;
  resetSignal: number;
}) {
  return (
    <Physics
      gravity={[0, -9.81, 0]}
      updatePriority={RAPIER_UPDATE_PRIORITY}
      timeStep="vary"
    >
      <ambientLight intensity={3} color="#e8ddd0" />
      <directionalLight
        position={[100, 200, 100]}
        intensity={1.0}
        color="#f5e6d0"
      />
      <fog attach="fog" args={["#c8bfad", 300, 900]} />

      <SkyBackground />
      <Car ref={vehicleRef} />
      <Track />
      <TrackWalls />
      <Ground />
      <Buildings />
      <Trees />
      <ChaseCamera vehicleRef={vehicleRef} />
      <GameLogic
        vehicleRef={vehicleRef}
        onStateChange={onStateChange}
        resetSignal={resetSignal}
      />
    </Physics>
  );
});
